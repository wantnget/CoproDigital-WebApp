import { NextRequest, NextResponse } from "next/server";
import { inviteUser } from "@/lib/api/invitations";

export async function POST(req: NextRequest) {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { ok: false, code: "invalid_json", message: "Body invalido." },
            { status: 400 },
        );
    }

    const email: string | undefined = body?.email;
    if (typeof email !== "string") {
        return NextResponse.json(
            {
                ok: false,
                code: "invalid_email",
                message: "El email es requerido.",
            },
            { status: 400 },
        );
    }

    // Origen de la app: lo tomamos del header origin (en dev sera
    // http://localhost:3000, en prod sera el dominio real). Como fallback
    // usamos NEXT_PUBLIC_APP_URL si existe.
    const origin =
        req.headers.get("origin") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "http://localhost:3000";

    const result = await inviteUser({ email, appOrigin: origin });

    const status = result.ok
        ? 200
        : result.code === "invalid_email"
        ? 400
        : result.code === "exists"
        ? 409
        : 500;

    return NextResponse.json(result, { status });
}
