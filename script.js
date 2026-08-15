// ==========================================
// SUPABASE
// ==========================================

const SUPABASE_URL =
    "https://fbjfjphvealwxaveoeyx.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_cpoQQu4uJ8KHE-wNHA7gbA_AJbHME__";


// ADMIN EMAIL

const ADMIN_EMAIL =
    "hamroqulovramziddin095@gmail.com";


const db =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ==========================================
// O'ZGARUVCHILAR
// ==========================================

let user = null;

let isAdmin = false;

let currentBlock = 2;

let items = [];

let realtimeChannel = null;


// ==========================================
// YORDAMCHI FUNKSIYALAR
// ==========================================

function money(number) {

    return new Intl.NumberFormat("uz-UZ")
        .format(
            Math.round(Number(number) || 0)
        )
        + " so‘m";
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/[&<>"']/g, function (char) {

            const map = {

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            };

            return map[char];

        });

}


function getPercent(row) {

    const planned =
        Number(row.planned) || 0;

    const used =
        Number(row.used) || 0;

    if (planned <= 0) {

        return 0;

    }

    return Math.max(
        0,
        Math.min(
            100,
            used / planned * 100
        )
    );
}


function getTotal(row) {

    const used =
        Number(row.used) || 0;

    const price =
        Number(row.price) || 0;

    return used * price;
}


// ==========================================
// LOGIN MODE
// ==========================================

function registerMode() {

    document.getElementById("authTitle")
        .textContent = "Ro‘yxatdan o‘tish";

    document.getElementById("authBtn")
        .textContent = "Ro‘yxatdan o‘tish";

    document.getElementById("authBtn")
        .onclick = register;

    document.getElementById("switch")
        .textContent = "Kirish";

    document.getElementById("switch")
        .onclick = loginMode;

    document.getElementById("err")
        .textContent = "";
}


function loginMode() {

    document.getElementById("authTitle")
        .textContent = "Kirish";

    document.getElementById("authBtn")
        .textContent = "Kirish";

    document.getElementById("authBtn")
        .onclick = login;

    document.getElementById("switch")
        .textContent = "Ro‘yxatdan o‘tish";

    document.getElementById("switch")
        .onclick = registerMode;

    document.getElementById("err")
        .textContent = "";
}


// ==========================================
// LOGIN
// ==========================================

async function login() {

    const email =
        document.getElementById("email")
            .value
            .trim();

    const password =
        document.getElementById("pass")
            .value;


    if (!email || !password) {

        document.getElementById("err")
            .textContent =
            "Email va parolni kiriting.";

        return;
    }


    const result =
        await db.auth.signInWithPassword({

            email: email,

            password: password

        });


    if (result.error) {

        document.getElementById("err")
            .textContent =
            result.error.message;

        return;
    }


    startUser(result.data.user);
}


// ==========================================
// RO'YXATDAN O'TISH
// ==========================================

async function register() {

    const email =
        document.getElementById("email")
            .value
            .trim();

    const password =
        document.getElementById("pass")
            .value;


    if (password.length < 6) {

        document.getElementById("err")
            .textContent =
            "Parol kamida 6 ta belgidan iborat bo‘lsin.";

        return;
    }


    const result =
        await db.auth.signUp({

            email: email,

            password: password

        });


    if (result.error) {

        document.getElementById("err")
            .textContent =
            result.error.message;

        return;
    }


    if (result.data.session) {

        startUser(result.data.user);

    } else {

        document.getElementById("err")
            .textContent =
            "Ro‘yxatdan o‘tish muvaffaqiyatli. Emailingizni tasdiqlang, keyin kiring.";

    }
}


// ==========================================
// CHIQISH
// ==========================================

async function logout() {

    await db.auth.signOut();

    location.reload();

}


// ==========================================
// FOYDALANUVCHINI ANIQLASH
// ==========================================

function startUser(currentUser) {

    user = currentUser;


    isAdmin =
        (user.email || "")
            .toLowerCase()
        ===
        ADMIN_EMAIL.toLowerCase();


    document.getElementById("auth")
        .style.display = "none";


    createBlocks();

    loadData();

    startRealtime();

}


// ==========================================
// BLOKLAR
// ==========================================

function createBlocks() {

    const container =
        document.getElementById("blocks");

    container.innerHTML = "";


    for (
        let number = 1;
        number <= 17;
        number++
    ) {

        const button =
            document.createElement("button");


        button.textContent =
            number + "-blok";


        if (number === currentBlock) {

            button.classList.add("active");

        }


        button.onclick = function () {

            currentBlock = number;

            createBlocks();

            loadData();

        };


        container.appendChild(button);

    }

}


// ==========================================
// MA'LUMOTLARNI YUKLASH
// ==========================================

async function loadData() {

    document.getElementById("status")
        .textContent =
        "Yuklanmoqda...";


    const result =
        await db
            .from("construction_items")
            .select("*")
            .eq("block_id", currentBlock)
            .order("id");


    if (result.error) {

        document.getElementById("status")
            .textContent =
            "Xatolik";

        document.getElementById("table")
            .innerHTML =
            `<tr>
                <td colspan="9">
                    ${escapeHTML(result.error.message)}
                </td>
            </tr>`;

        return;
    }


    items =
        result.data || [];


    renderTable();


    document.getElementById("status")
        .textContent =
        isAdmin
            ? "Admin ✓"
            : "Faqat ko‘rish ✓";


    document.getElementById("title")
        .textContent =
        currentBlock + "-blok";


    document.getElementById("head")
        .textContent =
        currentBlock + "-blok — Ishlar";

}


// ==========================================
// JADVALNI CHIZISH
// ==========================================

function renderTable() {

    const table =
        document.getElementById("table");


    table.innerHTML = "";


    items.forEach(function (row, index) {

        const percent =
            getPercent(row);


        let material;

        let planned;

        let used;

        let unit;

        let price;


        if (isAdmin) {

            material =
                `<input
                    class="cell"
                    data-index="${index}"
                    data-field="material"
                    value="${escapeHTML(row.material || "")}"
                >`;


            planned =
                `<input
                    class="cell"
                    type="number"
                    data-index="${index}"
                    data-field="planned"
                    value="${Number(row.planned) || 0}"
                >`;


            used =
                `<input
                    class="cell"
                    type="number"
                    data-index="${index}"
                    data-field="used"
                    value="${Number(row.used) || 0}"
                >`;


            unit =
                `<input
                    class="cell"
                    data-index="${index}"
                    data-field="unit"
                    value="${escapeHTML(row.unit || "")}"
                >`;


            price =
                `<input
                    class="cell"
                    type="number"
                    data-index="${index}"
                    data-field="price"
                    value="${Number(row.price) || 0}"
                >`;

        } else {

            material =
                escapeHTML(row.material || "");

            planned =
                Number(row.planned) || 0;

            used =
                Number(row.used) || 0;

            unit =
                escapeHTML(row.unit || "");

            price =
                money(row.price);

        }


        const tr =
            document.createElement("tr");


        tr.innerHTML = `

            <td>${index + 1}</td>

            <td>
                <b>
                    ${escapeHTML(row.name)}
                </b>
            </td>

            <td>
                ${material}
            </td>

            <td>
                ${planned}
            </td>

            <td>
                ${used}
            </td>

            <td>
                ${unit}
            </td>

            <td>
                ${price}
            </td>

            <td class="money">
                ${money(getTotal(row))}
            </td>

            <td>

                <b>
                    ${percent.toFixed(0)}%
                </b>

                <div class="bar">

                    <div
                        class="fill"
                        style="width:${percent}%"
                    ></div>

                </div>

            </td>

        `;


        table.appendChild(tr);

    });


    if (isAdmin) {

        document
            .querySelectorAll(".cell")
            .forEach(function (input) {

                input.addEventListener(
                    "change",
                    saveData
                );

            });

    }


    updateStatistics();

}


// ==========================================
// MA'LUMOTNI SAQLASH
// ==========================================

async function saveData(event) {

    if (!isAdmin) {

        return;

    }


    const input =
        event.target;


    const index =
        Number(input.dataset.index);


    const field =
        input.dataset.field;


    let value =
        input.value;


    if (
        field === "planned" ||
        field === "used" ||
        field === "price"
    ) {

        value =
            Number(value) || 0;

    }


    items[index][field] =
        value;


    const row =
        items[index];


    const result =
        await db
            .from("construction_items")
            .update({

                material:
                    row.material || "",

                planned:
                    Number(row.planned) || 0,

                used:
                    Number(row.used) || 0,

                unit:
                    row.unit || "",

                price:
                    Number(row.price) || 0,

                updated_at:
                    new Date().toISOString()

            })
            .eq("id", row.id);


    if (result.error) {

        alert(
            "Saqlash xatosi: "
            + result.error.message
        );

        return;

    }


    renderTable();

}


// ==========================================
// STATISTIKA
// ==========================================

function updateStatistics() {

    const count =
        items.length;


    const average =
        count
            ? items.reduce(
                function (total, row) {

                    return total +
                        getPercent(row);

                },
                0
            ) / count
            : 0;


    const sum =
        items.reduce(
            function (total, row) {

                return total +
                    getTotal(row);

            },
            0
        );


    const done =
        items.filter(
            function (row) {

                return getPercent(row) >= 100;

            }
        ).length;


    document.getElementById("avg")
        .textContent =
        average.toFixed(0) + "%";


    document.getElementById("sum")
        .textContent =
        money(sum);


    document.getElementById("count")
        .textContent =
        count;


    document.getElementById("done")
        .textContent =
        done;

}


// ==========================================
// REALTIME
// ==========================================

function startRealtime() {

    if (realtimeChannel) {

        db.removeChannel(
            realtimeChannel
        );

    }


    realtimeChannel =
        db
            .channel("construction-live")

            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "construction_items"
                },

                function (payload) {

                    const newBlock =
                        payload.new
                            ?.block_id;

                    const oldBlock =
                        payload.old
                            ?.block_id;


                    if (
                        newBlock === currentBlock ||
                        oldBlock === currentBlock
                    ) {

                        loadData();

                    }

                }

            )

            .subscribe();

}


// ==========================================
// SAYT OCHILGANDA USERNI TEKSHIRISH
// ==========================================

db.auth.getUser()
    .then(function (result) {

        if (result.data.user) {

            startUser(
                result.data.user
            );

        }

    });