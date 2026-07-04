import { NextRequest, NextResponse } from "next/server";
import { HIRO_API } from "@/lib/sdk";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${HIRO_API}/extended/v2/addresses/${address}/transactions?limit=30&order=desc`,
      { next: { revalidate: 15 } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Hiro API ${res.status}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
