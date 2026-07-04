import { NextRequest, NextResponse } from "next/server";
import { getReadOnlySdk, HIRO_API } from "@/lib/sdk";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  try {
    const sdk = getReadOnlySdk(address);
    const [state, rules, blockHeight] = await Promise.all([
      sdk.getVaultState(address),
      sdk.getRoutingRules(address),
      sdk.getCurrentBlockHeight(address),
    ]);

    return NextResponse.json({ state, rules, blockHeight });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
