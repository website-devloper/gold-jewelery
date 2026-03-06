const admin = require("firebase-admin");

try {
    const serviceAccount = require("./service-account-key.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("Firebase admin init error", error);
    process.exit(1);
}

const db = admin.firestore();

const categoryTranslations = {
    "cat_women_accessories": "اكسسوارات",
    "cat_women_bottoms": "بناطيل وتنانير",
    "cat_women_dresses": "فساتين",
    "cat_women_shoes": "أحذية",
    "cat_women_tops": "بلايز وقمصان"
};

const productTranslations = {
    "prod_bodycon_dress": { name: "فستان سهرة ضيق", description: "فستان ضيق وأنيق مثالي للحفلات والمناسبات المسائية." },
    "prod_cardigan": { name: "كارديجان مريح", description: "كارديجان دافئ ومريح مثالي للارتداء في الأيام الباردة." },
    "prod_cargo_pants": { name: "بنطلون كارجو", description: "بنطلون كارجو عصري بجيوب متعددة. مثالي للإطلالات الكاجوال." },
    "prod_casual_t_shirt": { name: "تي شيرت قطني كلاسيكي", description: "تي شيرت قطني مريح وعملي. مناسب للاستخدام اليومي." },
    "prod_denim_jacket": { name: "جاكيت جينز كلاسيكي", description: "جاكيت جينز بتصميم كلاسيكي لا تبطل موضته أبدًا." },
    "prod_designer_handbag": { name: "حقيبة يد جلدية فاخرة", description: "حقيبة يد من الجلد الفاخر بتصميم أنيق وعملي." },
    "prod_flat_sandals": { name: "صندل مسطح مريح", description: "صندل مسطح ومريح مثالي لفصل الصيف والاستخدام اليومي." },
    "prod_floral_maxi_dress": { name: "فستان ماكسي بطبعة زهور", description: "فستان طويل وجميل مزين بطبعات زهور مبهجة." },
    "prod_heels": { name: "كعب عالي كلاسيكي", description: "حذاء كعب عالي بتصميم أنيق يناسب المناسبات الخاصة." },
    "prod_high_waist_jeans": { name: "جينز ضيق بخصر عالي", description: "بنطلون جينز ضيق ومريح بخصر مرتفع لإطلالة جذابة." },
    "prod_leather_ankle_boots": { name: "حذاء كاحل جلدي", description: "حذاء كاحل من الجلد بتصميم عصري وأنيق للمواسم الباردة." },
    "prod_loafers": { name: "حذاء لوفر كلاسيكي", description: "حذاء لوفر عملي ومريح للعمل والإطلالات اليومية الرسمية." },
    "prod_midi_dress": { name: "فستان ميدي أنيق", description: "فستان بطول متوسط وتصميم كلاسيكي يبرز أنوثتك." },
    "prod_necklace": { name: "قلادة ذهبية", description: "قلادة أنيقة باللون الذهبي تكمل أناقتك." },
    "prod_pleated_skirt": { name: "تنورة ميدي بطيات", description: "تنورة أنيقة بطيات وتصميم متوسط الطول لمظهر أنثوي راقٍ." },
    "prod_scarf": { name: "وشاح حريري", description: "وشاح ناعم وفاخر من الحرير بطبعات جميلة." },
    "prod_shirt_dress": { name: "فستان قميص كلاسيكي", description: "فستان بتصميم قميص عصري ومريح يناسب جميع الأوقات." },
    "prod_shorts": { name: "شورت بخصر عالي", description: "شورت صيفي مريح وعملي بخصر مرتفع." },
    "prod_silk_blouse": { name: "بلوزة حريرية أنيقة", description: "بلوزة من الحرير الناعم تضفي لمسة من الفخامة على إطلالتك." },
    "prod_sneakers": { name: "حذاء رياضي أبيض كلاسيكي", description: "حذاء رياضي أنيق باللون الأبيض مريح للمشي اليومي." },
    "prod_sunglasses": { name: "نظارات شمسية فاخرة", description: "نظارات شمسية ذات تصميم فاخر تحميك من أشعة الشمس بأناقة." },
    "prod_tank_top": { name: "تانك توب أساسي", description: "قطعة أساسية مريحة وعملية يمكن ارتداؤها تحت الملابس أو وحدها." },
    "prod_watch": { name: "ساعة أنيقة", description: "ساعة معصم عصرية تناسب الإطلالات الكاجوال والرسمية." },
    "prod_wide_leg_pants": { name: "بنطلون واسع", description: "بنطلون مريح بتصميم أرجل واسعة لإطلالة أنيقة وعملية." },
    "prod_wrap_dress": { name: "فستان لف بطبعة زهور", description: "فستان بتصميم لاف مزخرف بزهور جميلة وقصة تلائم الجميع." }
};

async function main() {
    try {
        let catCount = 0;
        let prodCount = 0;

        // Update Categories
        const categoriesSnapshot = await db.collection("categories").get();
        for (const docSnapshot of categoriesSnapshot.docs) {
            const data = docSnapshot.data();
            const catId = docSnapshot.id;
            if (categoryTranslations[catId]) {
                const translations = (data.translations || []).filter(t => t.languageCode !== 'en');
                translations.push({
                    languageCode: 'en',
                    name: data.name,
                    updatedAt: admin.firestore.Timestamp.now()
                });

                await db.collection("categories").doc(catId).update({
                    name: categoryTranslations[catId],
                    translations: translations
                });
                catCount++;
            }
        }

        // Update Products
        const productsSnapshot = await db.collection("products").get();
        for (const docSnapshot of productsSnapshot.docs) {
            const data = docSnapshot.data();
            const prodId = docSnapshot.id;
            if (productTranslations[prodId]) {
                const translations = (data.translations || []).filter(t => t.languageCode !== 'en');
                translations.push({
                    languageCode: 'en',
                    name: data.name,
                    description: data.description || "",
                    updatedAt: admin.firestore.Timestamp.now()
                });

                await db.collection("products").doc(prodId).update({
                    name: productTranslations[prodId].name,
                    description: productTranslations[prodId].description,
                    translations: translations
                });
                prodCount++;
            }
        }

        console.log(`Success! Updated ${catCount} categories and ${prodCount} products.`);
    } catch (error) {
        console.error("Error updating documents:", error);
    }
}

main();
