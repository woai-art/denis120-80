import { NextResponse } from "next/server";
import { getProductByBarcode } from "@/lib/openfoodfacts";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { code } = await params;

  if (!/^\d{6,14}$/.test(code)) {
    return NextResponse.json({ error: "invalid_barcode" }, { status: 400 });
  }

  const product = await getProductByBarcode(code, user.id);

  if (!product) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}
