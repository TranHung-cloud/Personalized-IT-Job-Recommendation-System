package com.itjobrecommendation.backend.service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

final class CompanyNameNormalizer {
    private static final Pattern NON_NAME_CHARS = Pattern.compile("[^\\p{L}\\p{N}\\s+#./-]");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    private static final List<String> PREFIXES = List.of(
            "cong ty co phan", "cong ty tnhh mot thanh vien", "cong ty tnhh mtv",
            "cong ty tnhh", "cong ty cp", "cong ty", "tap doan");
    private static final List<String> SUFFIXES = List.of(
            "company limited", "limited liability company", "joint stock company", "joint stock",
            "co ltd", "co limited", "company ltd", "corporation", "incorporated",
            "limited", "ltd", "inc", "jsc", "llc");

    private CompanyNameNormalizer() {}

    static String normalize(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKC)
                .toLowerCase(Locale.ROOT).replace('đ', 'd');
        normalized = Normalizer.normalize(normalized, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        normalized = normalized.replaceAll("[\\u2010-\\u2015\\u2212]", "-");
        normalized = WHITESPACE.matcher(NON_NAME_CHARS.matcher(normalized).replaceAll(" ")).replaceAll(" ").trim();

        for (String prefix : PREFIXES) {
            if (normalized.equals(prefix)) return "";
            if (normalized.startsWith(prefix + " ")) {
                normalized = normalized.substring(prefix.length()).trim();
                break;
            }
        }
        for (String suffix : SUFFIXES) {
            if (normalized.equals(suffix)) return "";
            if (normalized.endsWith(" " + suffix)) {
                normalized = normalized.substring(0, normalized.length() - suffix.length() - 1).trim();
                break;
            }
        }
        return normalized;
    }
}
