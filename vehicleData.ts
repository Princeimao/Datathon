export const vehicles = [
    // ================= SNATCHING / BIKE GANG =================

    {
        id: "VEH-0001",
        registrationNo: "DL8SAB1234",
        make: "Bajaj",
        model: "Pulsar 220",
        color: "Black"
    },
    {
        id: "VEH-0002",
        registrationNo: "DL5SCZ8821",
        make: "Bajaj",
        model: "Pulsar 150",
        color: "Black"
    },
    {
        id: "VEH-0003",
        registrationNo: "DL10RT4412",
        make: "Yamaha",
        model: "FZ",
        color: "Blue"
    },
    {
        id: "VEH-0004",
        registrationNo: "DL3SDF9981",
        make: "TVS",
        model: "Apache RTR",
        color: "Black"
    },
    {
        id: "VEH-0005",
        registrationNo: "DL9CAC7742",
        make: "Bajaj",
        model: "Pulsar 220",
        color: "Red"
    },

    // reused suspicious pattern vehicles
    {
        id: "VEH-0006",
        registrationNo: "DL8SAB5678",
        make: "Bajaj",
        model: "Pulsar 150",
        color: "Black"
    },
    {
        id: "VEH-0007",
        registrationNo: "DL7SDE1122",
        make: "Hero",
        model: "Splendor",
        color: "Black"
    },
    {
        id: "VEH-0008",
        registrationNo: "DL1SAB9090",
        make: "Bajaj",
        model: "Pulsar 220",
        color: "Black"
    },

    // ================= CAR THEFT NETWORK =================

    {
        id: "VEH-0009",
        registrationNo: "DL4CAX1123",
        make: "Hyundai",
        model: "Creta",
        color: "White"
    },
    {
        id: "VEH-0010",
        registrationNo: "DL12CB8891",
        make: "Maruti",
        model: "Swift",
        color: "Red"
    },
    {
        id: "VEH-0011",
        registrationNo: "DL3CAF4421",
        make: "Hyundai",
        model: "i20",
        color: "Silver"
    },
    {
        id: "VEH-0012",
        registrationNo: "DL8CBA7711",
        make: "Maruti",
        model: "Baleno",
        color: "White"
    },
    {
        id: "VEH-0013",
        registrationNo: "DL9CAD3344",
        make: "Toyota",
        model: "Innova",
        color: "Grey"
    },

    {
        id: "VEH-0014",
        registrationNo: "DL1CXY9087",
        make: "Mahindra",
        model: "Scorpio",
        color: "Black"
    },

    {
        id: "VEH-0015",
        registrationNo: "DL5CKL5543",
        make: "Hyundai",
        model: "Verna",
        color: "White"
    },

    // ================= CHOP SHOP / ILLEGAL GARAGE NETWORK =================

    {
        id: "VEH-0016",
        registrationNo: "DL8XYZ4411",
        make: "Maruti",
        model: "WagonR",
        color: "Silver"
    },
    {
        id: "VEH-0017",
        registrationNo: "DL2ABM3322",
        make: "Hyundai",
        model: "Santro",
        color: "Blue"
    },
    {
        id: "VEH-0018",
        registrationNo: "DL3FRT7766",
        make: "Tata",
        model: "Tiago",
        color: "White"
    },
    {
        id: "VEH-0019",
        registrationNo: "DL7QWE8822",
        make: "Maruti",
        model: "Alto",
        color: "Red"
    },

    // ================= DRUG TRANSPORT VEHICLES =================

    {
        id: "VEH-0020",
        registrationNo: "DL8SDE9088",
        make: "Mahindra",
        model: "Bolero",
        color: "White"
    },
    {
        id: "VEH-0021",
        registrationNo: "DL1LKO3345",
        make: "Force",
        model: "Traveller",
        color: "White"
    },
    {
        id: "VEH-0022",
        registrationNo: "DL5XYZ1129",
        make: "Tata",
        model: "Ace",
        color: "Blue"
    },

    // ================= FRAUD / CALL CENTER LOGISTICS =================

    {
        id: "VEH-0023",
        registrationNo: "DL9FRA1234",
        make: "Honda",
        model: "City",
        color: "White"
    },
    {
        id: "VEH-0024",
        registrationNo: "DL3FRA7788",
        make: "Hyundai",
        model: "i10",
        color: "Silver"
    },
    {
        id: "VEH-0025",
        registrationNo: "DL2FRA8899",
        make: "Toyota",
        model: "Etios",
        color: "White"
    },

    // ================= NORMAL CITY MIX (BACKGROUND DATA) =================

    {
        id: "VEH-0026",
        registrationNo: "DL1NOR1001",
        make: "Maruti",
        model: "Swift",
        color: "White"
    },
    {
        id: "VEH-0027",
        registrationNo: "DL4NOR2233",
        make: "Hyundai",
        model: "i20",
        color: "Black"
    },
    {
        id: "VEH-0028",
        registrationNo: "DL6NOR3344",
        make: "Honda",
        model: "Amaze",
        color: "Silver"
    },

    {
        id: "VEH-0029",
        registrationNo: "DL8NOR5566",
        make: "Tata",
        model: "Nexon",
        color: "Blue"
    },

    {
        id: "VEH-0030",
        registrationNo: "DL9NOR7788",
        make: "Mahindra",
        model: "XUV300",
        color: "Red"
    },

    // ================= EXPANSION (31–100 condensed but unique patterns) =================

    ...Array.from({ length: 70 }).map((_, i) => {
        const makes = ["Maruti", "Hyundai", "Tata", "Honda", "Toyota", "Mahindra"];
        const models = ["Swift", "i20", "Altroz", "City", "Innova", "Scorpio", "Baleno"];
        const colors = ["White", "Black", "Silver", "Grey", "Red", "Blue"];

        return {
            id: `VEH-${String(i + 31).padStart(4, "0")}`,
            registrationNo: `DL${Math.floor(1 + Math.random() * 9)}X${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.floor(1000 + Math.random() * 8999)}`,
            make: makes[i % makes.length],
            model: models[i % models.length],
            color: colors[i % colors.length]
        };
    })
];