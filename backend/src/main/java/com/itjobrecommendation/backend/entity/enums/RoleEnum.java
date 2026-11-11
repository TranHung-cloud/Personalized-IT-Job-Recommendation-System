package com.itjobrecommendation.backend.entity.enums;

public enum RoleEnum {
    ADMIN("ADMIN", "Quản trị viên"),
    USER("USER", "Người dùng");

    private final String roleName;
    private final String displayName;

    RoleEnum(String roleName, String displayName) {
        this.roleName = roleName;
        this.displayName = displayName;
    }

    public String getRoleName() {
        return roleName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
