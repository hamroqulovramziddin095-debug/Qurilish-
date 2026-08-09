// =====================================================
// SUPABASE SOZLAMALARI
// =====================================================

const SUPABASE_URL = "BU_YERGA_SUPABASE_URL";
const SUPABASE_ANON_KEY = "BU_YERGA_ANON_PUBLIC_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// =====================================================
// BLOKLAR
// =====================================================

let currentBlock = 1;
let currentRows = [];

const blocks = Array.from({ length: 17 }, (_, i) => ({
    id: i + 1,
    name: `${i + 1}-blok`
}));


// =====================================================
// BLOKLARNI CHIQARISH
// =====================================================

function renderBlocks() {

    const container = document.getElementById("blockButtons");

    if (!container) return;

    container.innerHTML = "";

    blocks.forEach(block => {

        const button = document.createElement("button");

        button.className =
            "block-btn " +
            (block.id === currentBlock ? "active" : "");

        button.textContent = block.name;

        button.onclick = () => {

            currentBlock = block.id;

            renderBlocks();
            loadData();
            subscribeRealtime();

        };

        container.appendChild(button);

    });
}


// =====================================================
// SUPABASEDAN MA'LUMOT OLISH
// =====================================================

async function loadData() {

    setConnection("Yuklanmoqda...", false);

    const { data, error } = await supabaseClient
        .from("construction_items")
        .select("*")
        .eq("block_id", currentBlock)
        .order("id", { ascending: true });

    if (error) {

        console.error(error);

        setConnection("Baza xatosi", false);

        return;
    }

    currentRows = data || [];

    renderTable();

    setConnection("Server bilan ulangan ✓", true);
}


// =====================================================
// JADVAL
// =====================================================

function renderTable() {

    const table = document.getElementById("taskTable");

    if (!table) return;

    table.innerHTML = "";

    currentRows.forEach((row, index) => {

        const percent = calculatePercent(row);

        const total =
            Number(row.used || 0) *
            Number(row.price || 0);

        const tr = document.createElement("tr");

        tr.innerHTML = `

            <td class="task-name">
                ${escapeHtml(row.name)}
            </td>

            <td>
                <input
                    class="input"
                    value="${escapeHtml(row.material || "")}"
                    placeholder="Beton / Armatura / Uskuna"
                    data-index="${index}"
                    data-field="material"
                >
            </td>

            <td>
                <input
                    class="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value="${row.planned || 0}"
                    data-index="${index}"
                    data-field="planned"
                >
            </td>

            <td>
                <input
                    class="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value="${row.used || 0}"
                    data-index="${index}"
                    data-field="used"
                >
            </td>

            <td>
                <input
                    class="input"
                    value="${escapeHtml(row.unit || "m³")}"
                    data-index="${index}"
                    data-field="unit"
                >
            </td>

            <td>
                <input
                    class="input"
                    type="number"
                    min="0"
                    step="1"
                    value="${row.price || 0}"
                    data-index="${index}"
                    data-field="price"
                >
            </td>

            <td class="money">
                ${formatMoney(total)}
            </td>

            <td class="progress-cell">

                <div class="p-row">

                    <div class="bar">
                        <div
                            class="fill"
                            style="width:${percent}%"
                        ></div>
                    </div>

                    <div class="pct">
                        ${percent.toFixed(0)}%
                    </div>

                </div>

                <div class="status">

                    ${
                        percent >= 100
                            ? "✓ Tugagan"
                            : percent > 0
                                ? "Jarayonda"
                                : "Boshlanmagan"
                    }

                </div>

            </td>
        `;

        table.appendChild(tr);

    });


    // INPUT O'ZGARGANDA SAQLASH

    table.querySelectorAll("input").forEach(input => {

        input.addEventListener("change", handleInputChange);

    });


    updateSummary();
}


// =====================================================
// INPUT O'ZGARGANDA
// =====================================================

async function handleInputChange(event) {

    const input = event.target;

    const index =
        Number(input.dataset.index);

    const field =
        input.dataset.field;

    let value = input.value;

    if (
        field === "planned" ||
        field === "used" ||
        field === "price"
    ) {

        value = Number(value) || 0;

    }

    currentRows[index][field] = value;

    await saveRow(currentRows[index]);

}


// =====================================================
// SUPABASEGA SAQLASH
// =====================================================

async function saveRow(row) {

    const data = {

        id: row.id,

        block_id: row.block_id,

        name: row.name,

        material: row.material || "",

        planned:
            Number(row.planned) || 0,

        used:
            Number(row.used) || 0,

        unit:
            row.unit || "m³",

        price:
            Number(row.price) || 0,

        updated_at:
            new Date().toISOString()

    };


    const { error } = await supabaseClient
        .from("construction_items")
        .upsert(data);


    if (error) {

        console.error(
            "Saqlash xatosi:",
            error
        );

        setConnection(
            "Saqlashda xato",
            false
        );

        return;
    }


    setConnection(
        "Serverga saqlandi ✓",
        true
    );


    // Jadvalni qayta hisoblash

    renderTable();

}


// =====================================================
// FOIZ HISOBLASH
// =====================================================

function calculatePercent(row) {

    const planned =
        Number(row.planned) || 0;

    const used =
        Number(row.used) || 0;


    if (planned <= 0) {

        return 0;

    }


    return Math.min(
        100,
        Math.max(
            0,
            (used / planned) * 100
        )
    );

}


// =====================================================
// UMUMIY HISOB
// =====================================================

function updateSummary() {

    if (!currentRows.length) {

        setText("avgProgress", "0%");
        setText("totalSpent", "0 so‘m");
        setText("materialCount", "0");
        setText("doneCount", "0");

        return;

    }


    const average =
        currentRows.reduce(
            (sum, row) =>
                sum + calculatePercent(row),
            0
        ) / currentRows.length;


    const total =
        currentRows.reduce(
            (sum, row) =>
                sum +
                (
                    Number(row.used) || 0
                ) *
                (
                    Number(row.price) || 0
                ),
            0
        );


    const materialCount =
        currentRows.filter(row =>
            (
                row.material &&
                row.material.trim() !== ""
            ) ||
            Number(row.used) > 0
        ).length;


    const doneCount =
        currentRows.filter(
            row =>
                calculatePercent(row) >= 100
        ).length;


    setText(
        "avgProgress",
        average.toFixed(0) + "%"
    );

    setText(
        "totalSpent",
        formatMoney(total)
    );

    setText(
        "materialCount",
        materialCount
    );

    setText(
        "doneCount",
        doneCount
    );


    const bar =
        document.getElementById("avgBar");

    if (bar) {

        bar.style.width =
            average + "%";

    }

}


// =====================================================
// REALTIME
// =====================================================

let realtimeChannel = null;


function subscribeRealtime() {

    if (realtimeChannel) {

        supabaseClient.removeChannel(
            realtimeChannel
        );

    }


    realtimeChannel =
        supabaseClient

            .channel(
                "construction-live-" +
                currentBlock
            )

            .on(

                "postgres_changes",

                {
                    event: "*",
                    schema: "public",
                    table: "construction_items",
                    filter:
                        "block_id=eq." +
                        currentBlock
                },

                payload => {

                    console.log(
                        "Server yangilandi:",
                        payload
                    );

                    loadData();

                }

            )

            .subscribe();

}


// =====================================================
// YORDAMCHI FUNKSIYALAR
// =====================================================

function formatMoney(number) {

    return new Intl.NumberFormat(
        "uz-UZ"
    ).format(
        Math.round(
            Number(number) || 0
        )
    ) + " so‘m";

}


function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent = value;

    }

}


function setConnection(text, success) {

    const element =
        document.getElementById("connText");

    if (!element) return;

    element.textContent = text;

    const dot =
        document.getElementById("dot");

    if (dot) {

        dot.className =
            success ? "ok" : "bad";

    }

}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            character => {

                const chars = {

                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"

                };

                return chars[character];

            }
        );

}


// =====================================================
// BOSHLASH
// =====================================================

renderBlocks();

loadData();

subscribeRealtime();