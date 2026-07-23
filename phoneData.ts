function generateIndianNumber(index: number) {
    // Indian mobile numbers start with 6-9
    const prefixes = ["98", "97", "96", "91", "88", "87", "82", "81", "78", "77"];
    const prefix = prefixes[index % prefixes.length];

    const middle = String(Math.floor(1000 + Math.random() * 9000));
    const last = String(Math.floor(1000 + Math.random() * 9000));

    return `+91${prefix}${middle}${last}`;
}

// ================= CORE CLUSTER PHONES (IMPORTANT FOR INTELLIGENCE) =================
export const clusterPhones = [
    "+919812345678",
    "+919876543210",
    "+919901112223",
    "+919811223344",
    "+919922334455",
    "+919933445566",
    "+919944556677",
    "+919955667788",
    "+919966778899",
    "+919977889900"
];

export function getPhoneData() {
    const phones = clusterPhones.map(number => ({ number }));
    for (let i = 0; i < 1500; i++) {
        phones.push({
            number: generateIndianNumber(i)
        });
    }
    return phones;
}
