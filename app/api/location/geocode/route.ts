import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify User Token
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split("Bearer ")[1];
    await adminAuth.verifyIdToken(token);

    // 2. Parse Coordinates
    const { latitude, longitude } = await req.json();
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Maps API key not configured" }, { status: 500 });
    }

    // 3. Upstream Google Maps Geocoding API call
    const mapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&result_type=locality|sublocality|administrative_area_level_2&key=${apiKey}`;
    const response = await fetch(mapsUrl);
    const data = await response.json();

    if (data.status !== "OK" || !data.results?.length) {
      return NextResponse.json({ locality: "Unknown Location" });
    }

    // Format locality string (e.g., "Tangerang, Banten")
    const formattedAddress = data.results[0].formatted_address;

    return NextResponse.json({ locality: formattedAddress });
  } catch (error: any) {
    console.error("Geocode Proxy Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
