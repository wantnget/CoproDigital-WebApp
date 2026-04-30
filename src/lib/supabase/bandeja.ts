import { supabase } from "./client";
import { safeCall } from "./safe-call";
import type { SafeResult } from "./types";

/**
 * Capa de datos para la Bandeja de Solicitudes.
 *
 * Universo de filas: `valida1_requests`. Cada radicado pasa primero por la
 * validación inicial (valida1), y SOLO si la pasa puede llegar a tener un
 * registro en `motor_process`. Por eso valida1 es la fuente de verdad para
 * la lista, y motor_process se hace LEFT JOIN — puede faltar.
 *
 * Tablas relacionadas (todas por `radicado`):
 *   - valida1_requests     : universo principal
 *   - motor_process        : decisión del motor (puede no existir)
 *   - motor_data           : payloads crudos de las APIs
 *   - identity_validations : validación de identidad (puede no existir)
 *
 * Las RLS deben permitir lectura al rol authenticated. Si no, el admin
 * tendrá que crear policies.
 */

// ─── Tipos crudos ─────────────────────────────────────────────────────────

export interface MotorProcessRow {
    radicado: string;
    cedula: string | null;
    fecha: string | null;
    decision_final: string | null;
    decision_final_num: number | null;
    cumple_capacidad_pago: number | null;
    cumple_solvencia: number | null;
    cumple_ingreso_total: number | null;
    cumple_continuidad: number | null;
    cumple_score_minimo: number | null;
    cumple_mora_ext_12m: number | null;
    plazo_meses: number | null;
    cuota_incluye_el_seguro: string | null;
    capital_riesgo: string | null;
    pasivos: string | null;
    solvencia: string | null;
    capacidad_de_pago: string | null;
    request_json: string | null;
    response_json: string | null;
    created_at: string;
}

export interface Valida1Row {
    radicado: string;
    cedula: string | null;
    nombre: string | null;
    apellido: string | null;
    celular_chat: string | null;
    celular_copro: string | null;
    edad_calculada: string | null;
    antiguedad_meses: string | null;
    req_amount: string | null;
    saldo_capital: string | null;
    endeudamiento_total: string | null;
    valida_id: number | null;
    valida_ocupacion: number | null;
    valida_celular: number | null;
    valida_edad: number | null;
    valida_antiguedad: number | null;
    valida_endeudamiento_global: number | null;
    valida_mora_12m: number | null;
    valida_1: number | null;
    motivos_no_apto: string | null;
    request_json: string | null;
    response_json: string | null;
    created_at: string;
}

export interface MotorDataRow {
    radicado: string;
    cedula: string | null;
    fecha_radicacion: string | null;
    datos_asociado: string | null;
    api_responses: string | null;
    detallado_want: string | null;
    created_at: string;
}

export interface IdentityValidationRow {
    radicado: string;
    [key: string]: any;
}

// ─── Tipos UI ─────────────────────────────────────────────────────────────

export type SolicitudEstado =
    | "aprobado"
    | "preaprobado"
    | "en_revision"
    | "pendiente_docs"
    | "rechazado"
    | "desembolsado";

export interface ValidacionItem {
    label: string;
    key: string;
    estado: 1 | 2 | null;
}

export interface SolicitudUI {
    radicado: string;
    cedula: string;
    solicitante: string;
    fecha: string;
    valor: number;
    estado: SolicitudEstado;
    /** Score del motor. null si no hay motor_process aún. */
    score: number | null;
    /** Texto a mostrar en el header del detalle. */
    decisionTexto: string;
    /** True si NO hay motor_process para este radicado. */
    sinMotor: boolean;
    /** Lista de validaciones para el panel de "Campos clave". */
    validaciones: ValidacionItem[];
    raw: {
        valida1: Valida1Row;
        motor_process: MotorProcessRow | null;
        motor_data: MotorDataRow | null;
        identity_validation: IdentityValidationRow | null;
    };
}

// ─── Lógica de derivación ─────────────────────────────────────────────────

/**
 * Estado de la solicitud:
 *   - Si NO hay motor_process: se decide solo por valida1.
 *       valida_1 = 1 → en_revision (pasó valida1 pero motor aún no corrió)
 *       valida_1 = 2 → rechazado (no pasó la validación inicial)
 *   - Si HAY motor_process: manda decision_final.
 *       decision_final_num = 1 → aprobado
 *       decision_final_num = 2 → rechazado
 */
function deriveEstado(
    valida1: Valida1Row,
    motor: MotorProcessRow | null,
): SolicitudEstado {
    if (motor) {
        if (motor.decision_final_num === 1) return "aprobado";
        if (motor.decision_final_num === 2) return "rechazado";
        return "en_revision";
    }
    if (valida1.valida_1 === 2) return "rechazado";
    return "en_revision";
}

function buildValidaciones(
    valida1: Valida1Row,
    motor: MotorProcessRow | null,
): ValidacionItem[] {
    const v: ValidacionItem[] = [
        { label: "Validación celular", key: "valida_celular", estado: norm(valida1.valida_celular) },
        { label: "Validación identidad", key: "valida_id", estado: norm(valida1.valida_id) },
        { label: "Validación edad", key: "valida_edad", estado: norm(valida1.valida_edad) },
        { label: "Validación ocupación", key: "valida_ocupacion", estado: norm(valida1.valida_ocupacion) },
        { label: "Validación antigüedad", key: "valida_antiguedad", estado: norm(valida1.valida_antiguedad) },
        { label: "Endeudamiento global", key: "valida_endeudamiento_global", estado: norm(valida1.valida_endeudamiento_global) },
        { label: "Mora últimos 12 meses", key: "valida_mora_12m", estado: norm(valida1.valida_mora_12m) },
    ];

    if (motor) {
        v.push(
            { label: "Validación ingresos", key: "cumple_ingreso_total", estado: norm(motor.cumple_ingreso_total) },
            { label: "Validación centrales", key: "cumple_score_minimo", estado: norm(motor.cumple_score_minimo) },
            { label: "Capacidad de pago", key: "cumple_capacidad_pago", estado: norm(motor.cumple_capacidad_pago) },
            { label: "Historial cooperativa", key: "cumple_mora_ext_12m", estado: norm(motor.cumple_mora_ext_12m) },
            { label: "Solvencia", key: "cumple_solvencia", estado: norm(motor.cumple_solvencia) },
            { label: "Continuidad ingresos", key: "cumple_continuidad", estado: norm(motor.cumple_continuidad) },
        );
    }

    return v;
}

function norm(v: number | null | undefined): 1 | 2 | null {
    if (v === 1) return 1;
    if (v === 2) return 2;
    return null;
}

function extractScore(motor: MotorProcessRow | null): number | null {
    if (!motor?.request_json) return null;
    try {
        const parsed =
            typeof motor.request_json === "string"
                ? JSON.parse(motor.request_json)
                : motor.request_json;
        const v = parsed?.score_expe;
        if (typeof v === "number") return v;
        if (typeof v === "string") {
            const n = parseInt(v, 10);
            return Number.isFinite(n) ? n : null;
        }
        return null;
    } catch {
        return null;
    }
}

function extractMonto(
    valida1: Valida1Row,
    motor: MotorProcessRow | null,
): number {
    if (motor?.request_json) {
        try {
            const parsed =
                typeof motor.request_json === "string"
                    ? JSON.parse(motor.request_json)
                    : motor.request_json;
            const v = parsed?.monto_credito;
            if (typeof v === "number") return v;
            if (typeof v === "string") {
                const n = parseInt(v, 10);
                if (Number.isFinite(n)) return n;
            }
        } catch {
            /* fallthrough */
        }
    }
    if (valida1.req_amount) {
        const n = parseInt(valida1.req_amount, 10);
        if (Number.isFinite(n)) return n;
    }
    return 0;
}

/** "20260429" o "20260429145815" → "2026-04-29". */
function normalizeFecha(raw: string | null | undefined): string {
    if (!raw) return "";
    const m = String(raw).match(/^(\d{4})(\d{2})(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return String(raw);
}

function extractFechaFromRadicado(radicado: string): string {
    // formato: "10723551_260429145815" — los 6 primeros chars después del "_"
    // son YYMMDD
    const parts = radicado.split("_");
    if (parts.length < 2) return "";
    const ts = parts[1];
    if (ts.length < 6) return "";
    const yy = ts.slice(0, 2);
    const mm = ts.slice(2, 4);
    const dd = ts.slice(4, 6);
    return `20${yy}-${mm}-${dd}`;
}

function buildSolicitante(valida1: Valida1Row): string {
    const nombre = (valida1.nombre || "").trim();
    const apellido = (valida1.apellido || "").trim();
    const full = `${nombre} ${apellido}`.trim();
    return full || "—";
}

function decisionTexto(
    motor: MotorProcessRow | null,
    valida1: Valida1Row,
): string {
    if (!motor) {
        if (valida1.valida_1 === 1) return "Pendiente de motor";
        if (valida1.valida_1 === 2) return "No apto en valida1";
        return "—";
    }
    if (motor.decision_final_num === 1) return "Crédito Viable";
    if (motor.decision_final_num === 2) return "Crédito Inviable";
    return motor.decision_final ?? "—";
}

// ─── Lectores ──────────────────────────────────────────────────────────────

export interface ListSolicitudesOptions {
    limit?: number;
    /** Si se pasa, filtra por cédula. */
    cedulaFilter?: string;
}

export async function listSolicitudes(
    options: ListSolicitudesOptions = {},
): Promise<SafeResult<SolicitudUI[]>> {
    const limit = options.limit ?? 200;

    return safeCall(
        async () => {
            // 1) valida1_requests es el universo
            let v1Query = supabase
                .from("valida1_requests")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(limit);
            if (options.cedulaFilter)
                v1Query = v1Query.eq("cedula", options.cedulaFilter);

            const v1Res = await v1Query;
            if (v1Res.error) return { data: null, error: v1Res.error };

            const v1Rows = (v1Res.data ?? []) as Valida1Row[];
            if (v1Rows.length === 0)
                return { data: [] as SolicitudUI[], error: null };

            const radicados = v1Rows.map((r) => r.radicado);

            // 2) En paralelo: motor_process, motor_data, identity_validations
            const [mpRes, mdRes, ivRes] = await Promise.all([
                supabase.from("motor_process").select("*").in("radicado", radicados),
                supabase.from("motor_data").select("*").in("radicado", radicados),
                supabase
                    .from("identity_validations")
                    .select("*")
                    .in("radicado", radicados),
            ]);

            const mpRows = (mpRes.data ?? []) as MotorProcessRow[];
            const mdRows = (mdRes.data ?? []) as MotorDataRow[];
            const ivRows = ivRes.error
                ? []
                : ((ivRes.data ?? []) as IdentityValidationRow[]);

            if (mpRes.error)
                console.warn("[bandeja] motor_process:", mpRes.error.message);
            if (mdRes.error)
                console.warn("[bandeja] motor_data:", mdRes.error.message);
            if (ivRes.error)
                console.warn(
                    "[bandeja] identity_validations:",
                    ivRes.error.message,
                );

            const mpByRad = new Map<string, MotorProcessRow>();
            for (const r of mpRows) mpByRad.set(r.radicado, r);
            const mdByRad = new Map<string, MotorDataRow>();
            for (const r of mdRows) mdByRad.set(r.radicado, r);
            const ivByRad = new Map<string, IdentityValidationRow>();
            for (const r of ivRows) ivByRad.set(r.radicado, r);

            const out: SolicitudUI[] = v1Rows.map((v1) => {
                const motor = mpByRad.get(v1.radicado) ?? null;
                const md = mdByRad.get(v1.radicado) ?? null;
                const iv = ivByRad.get(v1.radicado) ?? null;

                // Fecha: del motor_process si existe; sino, del motor_data.fecha_radicacion;
                // sino, parseada del propio radicado
                const fecha =
                    normalizeFecha(motor?.fecha) ||
                    normalizeFecha(md?.fecha_radicacion) ||
                    extractFechaFromRadicado(v1.radicado);

                return {
                    radicado: v1.radicado,
                    cedula: v1.cedula ?? "",
                    solicitante: buildSolicitante(v1),
                    fecha,
                    valor: extractMonto(v1, motor),
                    estado: deriveEstado(v1, motor),
                    score: extractScore(motor),
                    decisionTexto: decisionTexto(motor, v1),
                    sinMotor: !motor,
                    validaciones: buildValidaciones(v1, motor),
                    raw: {
                        valida1: v1,
                        motor_process: motor,
                        motor_data: md,
                        identity_validation: iv,
                    },
                };
            });

            return { data: out, error: null };
        },
        { label: "bandeja.list", timeoutMs: 20_000 },
    );
}
