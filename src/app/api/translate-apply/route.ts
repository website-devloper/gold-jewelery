import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

let db: FirebaseFirestore.Firestore;

// Initialize Firebase Admin at runtime (not at build time)
// Initialize Firebase Admin at runtime
function initializeFirebase() {
    if (!admin.apps.length) {
        try {
            const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

            if (serviceAccountKey) {
                // Initialize using environment variable if available
                const serviceAccount = JSON.parse(serviceAccountKey);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            } else {
                // Fallback to local file for development using fs to avoid Turbopack require issues
                try {
                    const fs = require("fs");
                    const path = require("path");
                    const filePath = path.join(process.cwd(), "service-account-key.json");
                    if (fs.existsSync(filePath)) {
                        const serviceAccount = JSON.parse(fs.readFileSync(filePath, "utf8"));
                        admin.initializeApp({
                            credential: admin.credential.cert(serviceAccount)
                        });
                    } else {
                        console.warn("Service account file not found at " + filePath);
                    }
                } catch (fileError) {
                    console.warn("Error reading service account file:", fileError);
                }
            }
        } catch (error) {
            console.error("Firebase admin init error", error);
        }
    }
    return admin.firestore();
}

const categoryTranslations: Record<string, string> = {
    "cat_women_accessories": "اكسسوارات",
    "cat_women_bottoms": "بناطيل وتنانير",
    "cat_women_dresses": "فساتين",
    "cat_women_shoes": "أحذية",
    "cat_women_tops": "بلايز وقمصان"
};

const productTranslations: Record<string, { name: string, description: string }> = {
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

export async function GET() {
    try {
        const db = initializeFirebase();
        const results = { categories: 0, products: 0 };

        // Update Categories
        const categoriesSnapshot = await db.collection("categories").get();
        for (const docSnapshot of categoriesSnapshot.docs) {
            const data = docSnapshot.data();
            const catId = docSnapshot.id;
            if (categoryTranslations[catId]) {
                // Build translation array keeping English
                const translations = (data.translations || []).filter((t: any) => t.languageCode !== 'en');
                // Add english translation
                translations.push({
                    languageCode: 'en',
                    name: data.name,
                    updatedAt: new Date()
                });

                await db.collection("categories").doc(catId).update({
                    name: categoryTranslations[catId],
                    translations: translations
                });
                results.categories++;
            }
        }

        // Update Products
        const productsSnapshot = await db.collection("products").get();
        for (const docSnapshot of productsSnapshot.docs) {
            const data = docSnapshot.data();
            const prodId = docSnapshot.id;
            if (productTranslations[prodId]) {
                // Build translation array keeping English
                const translations = (data.translations || []).filter((t: any) => t.languageCode !== 'en');
                // Add english translation
                translations.push({
                    languageCode: 'en',
                    name: data.name,
                    description: data.description || "",
                    updatedAt: new Date()
                });

                await db.collection("products").doc(prodId).update({
                    name: productTranslations[prodId].name,
                    description: productTranslations[prodId].description,
                    translations: translations
                });
                results.products++;
            }
        }

        return NextResponse.json({ success: true, message: "Database localized successfully", results });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
