import { NextResponse } from "next/server";
import { getAllCategories } from "@/lib/firestore/categories_db";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/lib/firestore/products";

export async function GET() {
    try {
        const categories = await getAllCategories();

        // Get products
        const productsRef = collection(db, "products");
        const q = query(productsRef);
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

        const result = {
            categories: categories.map(c => ({ id: c.id, name: c.name, translations: c.translations || [] })),
            products: products.map(p => ({ id: p.id, name: p.name, description: p.description?.substring(0, 50) + "...", translations: p.translations || [] }))
        };

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
