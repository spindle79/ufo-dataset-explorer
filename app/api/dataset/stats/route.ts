import { NextResponse } from "next/server";
import { getDatasetStats } from "@/lib/stats";

export async function GET() {
  try {
    const stats = await getDatasetStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error getting dataset stats:", error);

    if (
      error instanceof Error &&
      error.message === "Dataset is empty or not accessible"
    ) {
      return NextResponse.json(
        {
          error: "No data available",
          message: "Dataset is empty or not accessible",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get dataset statistics",
      },
      { status: 500 }
    );
  }
}
