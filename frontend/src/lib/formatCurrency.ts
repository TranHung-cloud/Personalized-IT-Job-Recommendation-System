// Format số tiền thành tiền Việt Nam
export const formatCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return "";

    const number = Number(value);

    if (Number.isNaN(number)) return "";

    return new Intl.NumberFormat("vi-VN").format(number);
};

// Chuyển chuỗi tiền về số nguyên để gửi API
export const parseCurrency = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return 0;

    return Number(String(value).replace(/\D/g, ""));
};

// Format tiền kèm đơn vị VND
export const formatVND = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return "";

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(Number(value));
};
