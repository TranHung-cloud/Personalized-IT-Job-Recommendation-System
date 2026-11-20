package com.itjobrecommendation.backend.security;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.itjobrecommendation.backend.entity.Account;

import lombok.Getter;

@Getter
public class CustomUserDetails implements UserDetails {
    private final UUID id;
    private final String email;
    private final String password;
    private final boolean enabled;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(Account account) {
        this.id = account.getId();
        this.email = account.getEmail();
        this.password = account.getPasswordHash();
        this.enabled = Boolean.TRUE.equals(account.getEnabled());

        if (account.getRole() != null && account.getRole().getName() != null) {
            String roleName = account.getRole().getName();
            this.authorities = List.of(new SimpleGrantedAuthority("ROLE_" + roleName.toUpperCase()));
        } else {
            this.authorities = Collections.emptyList();
        }
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
