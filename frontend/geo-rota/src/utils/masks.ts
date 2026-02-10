export const unmask = (value: string): string => {
    return value.replace(/\D/g, '')
}

export const maskCPF = (value: string): string => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1')
}

export const maskPhone = (value: string): string => {
    const cleanValue = value.replace(/\D/g, '')

    if (cleanValue.length > 10) {
        // (11) 91234-5678
        return cleanValue
            .replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3')
    }

    // (11) 1234-5678
    return cleanValue
        .replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3')
}

export const maskCEP = (value: string): string => {
    return value
        .replace(/\D/g, '')
        .replace(/^(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1')
}
