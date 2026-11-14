package com.itjobrecommendation.backend.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import com.itjobrecommendation.backend.dto.CompanySuggestionDTO;
import com.itjobrecommendation.backend.entity.Company;
import com.itjobrecommendation.backend.repository.CompanyRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CompanyService {
    private static final String CLEARBIT_URL = "https://autocomplete.clearbit.com/v1/companies/suggest";
    private static final long RATE_WINDOW_MILLIS = 60 * 1000L;
    private static final int PER_CLIENT_REQUEST_LIMIT = 20;
    private static final int GLOBAL_EXTERNAL_REQUEST_LIMIT = 120;

    private final CompanyRepository companyRepository;
    private final RestClient restClient = createRestClient();
    private final Map<String, RateWindow> clientRateWindows = new ConcurrentHashMap<>();
    private RateWindow globalRateWindow = new RateWindow(Instant.now().toEpochMilli(), 0);

    private static RestClient createRestClient() {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build());
        requestFactory.setReadTimeout(Duration.ofSeconds(3));
        return RestClient.builder().requestFactory(requestFactory).build();
    }

    public List<CompanySuggestionDTO> searchCompanies(String keyword, String clientKey) {
        String searchName = keyword == null ? "" : keyword.trim();
        String normalizedSearch = CompanyNameNormalizer.normalize(searchName);
        if (normalizedSearch.isBlank()) return List.of();

        var exactMatch = companyRepository.findFirstByNormalizedName(normalizedSearch);
        if (exactMatch.isPresent()) return List.of(toSuggestion(exactMatch.get(), null));

        if (normalizedSearch.length() < 3) return List.of();
        long now = Instant.now().toEpochMilli();
        if (!consumeClientRequest(clientKey, now) || !consumeGlobalRequest(now)) {
            return findLocalCandidates(searchName, normalizedSearch);
        }

        List<ClearbitSuggestion> externalResults = fetchClearbit(searchName);
        return rankAndMerge(searchName, normalizedSearch, externalResults);
    }

    private List<ClearbitSuggestion> fetchClearbit(String keyword) {
        try {
            URI uri = UriComponentsBuilder.fromUriString(CLEARBIT_URL)
                    .queryParam("query", keyword)
                    .build()
                    .encode()
                    .toUri();
            List<ClearbitSuggestion> results = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
            return results == null ? List.of() : results.stream().limit(5).toList();
        } catch (RestClientException exception) {
            return List.of();
        }
    }

    private List<CompanySuggestionDTO> rankAndMerge(
            String originalQuery,
            String normalizedQuery,
            List<ClearbitSuggestion> clearbitResults) {
        Map<String, RankedSuggestion> merged = new LinkedHashMap<>();

        for (ClearbitSuggestion suggestion : clearbitResults) {
            if (suggestion.name() == null || suggestion.name().isBlank()) continue;
            Company match = findDatabaseMatch(suggestion.name());
            CompanySuggestionDTO dto = match == null
                    ? new CompanySuggestionDTO(null, suggestion.name().trim(), suggestion.domain())
                    : toSuggestion(match, suggestion.domain());
            String key = match == null
                    ? normalizedKey(suggestion.domain(), suggestion.name())
                    : "db:" + match.getId();
            merged.putIfAbsent(key, new RankedSuggestion(dto, similarity(normalizedQuery,
                    CompanyNameNormalizer.normalize(dto.getName()))));
        }

        for (Company company : findLocalCompanies(originalQuery, normalizedQuery)) {
            String key = "db:" + company.getId();
            merged.putIfAbsent(key, new RankedSuggestion(toSuggestion(company, null),
                    similarity(normalizedQuery, CompanyNameNormalizer.normalize(company.getName()))));
        }

        return merged.values().stream()
                .sorted(Comparator.comparingDouble(RankedSuggestion::score).reversed())
                .limit(5)
                .map(RankedSuggestion::suggestion)
                .toList();
    }

    private Company findDatabaseMatch(String candidateName) {
        String normalizedCandidate = CompanyNameNormalizer.normalize(candidateName);
        var exact = companyRepository.findFirstByNormalizedName(normalizedCandidate);
        if (exact.isPresent()) return exact.get();

        return companyRepository.findTop20ByNameContainingIgnoreCaseOrderByNameAsc(candidateName).stream()
                .map(company -> new RankedCompany(company, similarity(normalizedCandidate,
                        CompanyNameNormalizer.normalize(company.getName()))))
                .filter(candidate -> candidate.score() >= 0.82)
                .max(Comparator.comparingDouble(RankedCompany::score))
                .map(RankedCompany::company)
                .orElse(null);
    }

    private List<CompanySuggestionDTO> findLocalCandidates(String originalQuery, String normalizedQuery) {
        return findLocalCompanies(originalQuery, normalizedQuery).stream()
                .map(company -> new RankedSuggestion(toSuggestion(company, null),
                        similarity(normalizedQuery, CompanyNameNormalizer.normalize(company.getName()))))
                .sorted(Comparator.comparingDouble(RankedSuggestion::score).reversed())
                .limit(5)
                .map(RankedSuggestion::suggestion)
                .toList();
    }

    private List<Company> findLocalCompanies(String originalQuery, String normalizedQuery) {
        return companyRepository.findTop20ByNameContainingIgnoreCaseOrderByNameAsc(originalQuery).stream()
                .sorted(Comparator.<Company>comparingDouble(company -> similarity(normalizedQuery,
                        CompanyNameNormalizer.normalize(company.getName()))).reversed())
                .limit(5)
                .toList();
    }

    private double similarity(String left, String right) {
        if (left.isBlank() || right.isBlank()) return 0;
        if (left.equals(right)) return 1;
        if (right.startsWith(left)) return 0.85 + 0.15 * left.length() / right.length();
        if (left.startsWith(right)) return 0.75 + 0.25 * right.length() / left.length();

        int[] previous = new int[right.length() + 1];
        int[] current = new int[right.length() + 1];
        for (int j = 0; j <= right.length(); j++) previous[j] = j;
        for (int i = 1; i <= left.length(); i++) {
            current[0] = i;
            for (int j = 1; j <= right.length(); j++) {
                int substitution = previous[j - 1] + (left.charAt(i - 1) == right.charAt(j - 1) ? 0 : 1);
                current[j] = Math.min(Math.min(previous[j] + 1, current[j - 1] + 1), substitution);
            }
            int[] swap = previous;
            previous = current;
            current = swap;
        }
        double editScore = 1.0 - (double) previous[right.length()] / Math.max(left.length(), right.length());

        List<String> leftTokens = List.of(left.split("\\s+"));
        List<String> rightTokens = List.of(right.split("\\s+"));
        long overlap = leftTokens.stream().filter(rightTokens::contains).distinct().count();
        double tokenScore = (double) overlap / (leftTokens.size() + rightTokens.size() - overlap);
        return Math.max(editScore, tokenScore);
    }

    private boolean consumeClientRequest(String clientKey, long now) {
        String key = clientKey == null || clientKey.isBlank() ? "unknown" : clientKey;
        RateWindow window = clientRateWindows.compute(key, (ignored, old) -> {
            if (old == null || now - old.startedAt >= RATE_WINDOW_MILLIS) return new RateWindow(now, 1);
            return new RateWindow(old.startedAt, old.count + 1);
        });
        if (clientRateWindows.size() > 1000) {
            clientRateWindows.entrySet().removeIf(entry -> now - entry.getValue().startedAt >= RATE_WINDOW_MILLIS * 2);
        }
        return window.count <= PER_CLIENT_REQUEST_LIMIT;
    }

    private synchronized boolean consumeGlobalRequest(long now) {
        if (now - globalRateWindow.startedAt >= RATE_WINDOW_MILLIS) globalRateWindow = new RateWindow(now, 0);
        if (globalRateWindow.count >= GLOBAL_EXTERNAL_REQUEST_LIMIT) return false;
        globalRateWindow = new RateWindow(globalRateWindow.startedAt, globalRateWindow.count + 1);
        return true;
    }

    private String normalizedKey(String domain, String name) {
        return domain == null || domain.isBlank()
                ? "name:" + CompanyNameNormalizer.normalize(name)
                : "domain:" + domain.toLowerCase(Locale.ROOT);
    }

    private CompanySuggestionDTO toSuggestion(Company company, String domain) {
        return new CompanySuggestionDTO(company.getId(), company.getName(), domain);
    }

    private record ClearbitSuggestion(String name, String domain, String logo) {}
    private record RateWindow(long startedAt, int count) {}
    private record RankedSuggestion(CompanySuggestionDTO suggestion, double score) {}
    private record RankedCompany(Company company, double score) {}
}
