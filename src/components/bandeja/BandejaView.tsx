"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { bandeja } from "@/lib/supabase";
import type { SolicitudUI, SolicitudEstado } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Search,
    RefreshCw,
    Download,
    CheckCircle2,
    XCircle,
    MinusCircle,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

/**
 * Vista compartida de Bandeja de Solicitudes.
 * - mode = "admin": ve todas las solicitudes
 * - mode = "user":  ve solo las suyas (filtradas por cédula via cedulaFilter)
 */
type Mode = "admin" | "user";

interface BandejaViewProps {
    mode: Mode;
    /** Si se pasa, filtra solo solicitudes de esa cédula. */
    cedulaFilter?: string;
}

type FiltroTab = "todos" | SolicitudEstado;

const FILTROS: { id: FiltroTab; label: string }[] = [
    { id: "todos", label: "Todos" },
    { id: "aprobado", label: "Aprobado" },
    { id: "preaprobado", label: "Preaprobado" },
    { id: "en_revision", label: "En revisión" },
    { id: "pendiente_docs", label: "Pendiente docs" },
    { id: "rechazado", label: "Rechazado" },
    { id: "desembolsado", label: "Desembolsado" },
];

const ESTADO_LABEL: Record<SolicitudEstado, string> = {
    aprobado: "Aprobado",
    preaprobado: "Preaprobado",
    en_revision: "En revisión",
    pendiente_docs: "Pendiente docs",
    rechazado: "Rechazado",
    desembolsado: "Desembolsado",
};

const ESTADO_DOT: Record<SolicitudEstado, string> = {
    aprobado: "bg-green-500",
    preaprobado: "bg-blue-500",
    en_revision: "bg-amber-500",
    pendiente_docs: "bg-gray-400",
    rechazado: "bg-red-500",
    desembolsado: "bg-emerald-600",
};

export function BandejaView({ mode, cedulaFilter }: BandejaViewProps) {
    const [solicitudes, setSolicitudes] = useState<SolicitudUI[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [query, setQuery] = useState("");
    const [filtro, setFiltro] = useState<FiltroTab>("todos");
    const [selectedRadicado, setSelectedRadicado] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"campos" | "motor_json" | "respuesta">(
        "campos",
    );
    const [page, setPage] = useState(1);

    const PAGE_SIZE = 10;

    const fetchData = useCallback(async () => {
        const r = await bandeja.listSolicitudes({
            limit: 200,
            cedulaFilter,
        });
        if (!r.ok) {
            setError(r.error.message);
            setSolicitudes([]);
            return;
        }
        setError(null);
        setSolicitudes(r.data);
        setSelectedRadicado((current) => {
            if (current && r.data.some((s) => s.radicado === current))
                return current;
            return r.data[0]?.radicado ?? null;
        });
    }, [cedulaFilter]);

    useEffect(() => {
        setLoading(true);
        fetchData().finally(() => setLoading(false));
    }, [fetchData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const metricas = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        const hoy = solicitudes.filter((s) => s.fecha === today).length;
        const aprobadas = solicitudes.filter((s) => s.estado === "aprobado").length;
        const enProceso = solicitudes.filter(
            (s) => s.estado === "en_revision" || s.estado === "pendiente_docs",
        ).length;
        const monto = solicitudes.reduce((sum, s) => sum + (s.valor || 0), 0);
        const total = solicitudes.length || 1;
        return {
            hoy,
            aprobadas,
            aprobadasPct: Math.round((aprobadas / total) * 100),
            enProceso,
            monto,
        };
    }, [solicitudes]);

    const filtradas = useMemo(() => {
        let out = solicitudes;
        if (filtro !== "todos") out = out.filter((s) => s.estado === filtro);
        if (query.trim()) {
            const q = query.toLowerCase();
            out = out.filter(
                (s) =>
                    s.cedula.toLowerCase().includes(q) ||
                    s.solicitante.toLowerCase().includes(q) ||
                    s.radicado.toLowerCase().includes(q),
            );
        }
        return out;
    }, [solicitudes, filtro, query]);

    const conteoPorEstado = useMemo(() => {
        const map = new Map<FiltroTab, number>();
        map.set("todos", solicitudes.length);
        for (const s of solicitudes) {
            map.set(s.estado, (map.get(s.estado) ?? 0) + 1);
        }
        return map;
    }, [solicitudes]);

    // Paginación: 10 filas por página. La derivamos sobre `filtradas` para
    // que filtros y búsqueda manden. `page` se resetea a 1 cuando cambian
    // filtros, query o el set de solicitudes (p.ej. tras refresh).
    const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageStart = (safePage - 1) * PAGE_SIZE;
    const pageRows = filtradas.slice(pageStart, pageStart + PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [filtro, query, solicitudes]);

    const seleccionada = useMemo(
        () => solicitudes.find((s) => s.radicado === selectedRadicado) ?? null,
        [solicitudes, selectedRadicado],
    );

    const handleExportCSV = () => {
        if (filtradas.length === 0) return;
        const headers = [
            "identificacion",
            "fecha",
            "radicado",
            "solicitante",
            "valor",
            "estado",
            "score",
        ];
        const csv = [
            headers.join(","),
            ...filtradas.map((s) =>
                [
                    s.cedula,
                    s.fecha,
                    s.radicado,
                    `"${s.solicitante.replace(/"/g, '""')}"`,
                    s.valor,
                    ESTADO_LABEL[s.estado],
                    s.score ?? "",
                ].join(","),
            ),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bandeja_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const labelHoy = mode === "admin" ? "Solicitudes hoy" : "Mis solicitudes hoy";

    return (
        <div className="flex flex-col gap-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    color="border-l-amber-500"
                    label={labelHoy}
                    value={metricas.hoy.toString()}
                    foot={`${solicitudes.length} en total`}
                />
                <KpiCard
                    color="border-l-green-500"
                    label="Aprobadas"
                    value={metricas.aprobadas.toString()}
                    foot={`${metricas.aprobadasPct}% del total`}
                />
                <KpiCard
                    color="border-l-blue-500"
                    label="En proceso"
                    value={metricas.enProceso.toString()}
                    foot="Requieren acción"
                />
                <KpiCard
                    color="border-l-orange-500"
                    label="Monto solicitado"
                    value={formatCurrency(metricas.monto)}
                    foot={`${solicitudes.length} solicitudes`}
                />
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <p className="font-semibold">Error cargando la bandeja:</p>
                    <p className="mt-1">{error}</p>
                </div>
            )}

            {/* Buscador + filtros + acciones */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                    <div className="relative flex items-center w-full max-w-md">
                        <Search className="absolute left-3 h-4 w-4 text-[#0D0D0D]/40" />
                        <Input
                            placeholder="Buscar por identificación, solicitante o radicado..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="rounded-none border-[#0D0D0D]/20 pl-9 focus-visible:ring-0 focus-visible:border-[#012340] h-10"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {FILTROS.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setFiltro(f.id)}
                                className={`px-3 h-8 text-xs font-medium tracking-wider transition-all border ${
                                    filtro === f.id
                                        ? "bg-[#012340] text-white border-[#012340]"
                                        : "bg-white text-[#0D0D0D]/70 border-[#0D0D0D]/15 hover:border-[#012340] hover:text-[#012340]"
                                }`}
                            >
                                {f.label}{" "}
                                <span
                                    className={`ml-1 inline-flex items-center justify-center px-1.5 h-4 text-[10px] font-bold ${
                                        filtro === f.id
                                            ? "bg-white/20 text-white"
                                            : "bg-[#0D0D0D]/5 text-[#0D0D0D]/60"
                                    }`}
                                >
                                    {conteoPorEstado.get(f.id) ?? 0}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        className="rounded-none border-[#0D0D0D]/20 h-10 px-4 text-xs font-bold tracking-widest hover:bg-[#012340] hover:text-white hover:border-[#012340]"
                    >
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                    <Button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white h-10 px-4 text-xs font-bold tracking-widest"
                    >
                        <RefreshCw
                            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                        />
                        Actualizar
                    </Button>
                </div>
            </div>

            {/* Cuerpo: lista + detalle */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_minmax(420px,520px)] gap-6">
                <div className="bg-white border border-[#0D0D0D]/10">
                    <div className="px-4 py-3 border-b border-[#0D0D0D]/10 text-xs font-medium tracking-wider text-[#0D0D0D]/60">
                        Solicitudes{" "}
                        <span className="text-[#0D0D0D]">
                            {filtradas.length} de {solicitudes.length}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#0D0D0D]/10">
                                    {[
                                        "IDENTIFICACIÓN",
                                        "FECHA",
                                        "RADICADO",
                                        "SOLICITANTE",
                                        "VALOR",
                                        "ESTADO",
                                        "MOTOR",
                                    ].map((c) => (
                                        <th
                                            key={c}
                                            className="text-left px-4 py-3 text-[10px] font-bold tracking-[0.18em] text-[#0D0D0D]/50 uppercase whitespace-nowrap"
                                        >
                                            {c}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="py-10 text-center text-sm text-[#0D0D0D]/40"
                                        >
                                            Cargando solicitudes...
                                        </td>
                                    </tr>
                                ) : filtradas.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="py-10 text-center text-sm text-[#0D0D0D]/40"
                                        >
                                            No hay solicitudes para los filtros aplicados.
                                        </td>
                                    </tr>
                                ) : (
                                    pageRows.map((s) => {
                                        const selected = s.radicado === selectedRadicado;
                                        return (
                                            <tr
                                                key={s.radicado}
                                                onClick={() => setSelectedRadicado(s.radicado)}
                                                className={`border-b border-[#0D0D0D]/5 cursor-pointer transition-colors ${
                                                    selected
                                                        ? "bg-[#FFF8EC] border-l-4 border-l-[#F29A2E]"
                                                        : "hover:bg-black/[0.02] border-l-4 border-l-transparent"
                                                }`}
                                            >
                                                <td className="px-4 py-3 font-medium text-[#0D0D0D]">
                                                    {s.cedula}
                                                </td>
                                                <td className="px-4 py-3 text-[#0D0D0D]/70">
                                                    {formatFecha(s.fecha)}
                                                </td>
                                                <td className="px-4 py-3 text-[#0D0D0D]/70 font-mono text-xs">
                                                    {s.radicado}
                                                </td>
                                                <td className="px-4 py-3 text-[#0D0D0D]">
                                                    {s.solicitante}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-[#0D0D0D]">
                                                    {formatCurrency(s.valor)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-2 text-xs text-[#0D0D0D]/80">
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[s.estado]}`}
                                                        />
                                                        {ESTADO_LABEL[s.estado]}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <ScoreChip
                                                        score={s.score}
                                                        sinMotor={s.sinMotor}
                                                        estado={s.estado}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer de paginación. Solo aparece si hay filas. */}
                    {!loading && filtradas.length > 0 && (
                        <Paginator
                            page={safePage}
                            totalPages={totalPages}
                            totalRows={filtradas.length}
                            pageStart={pageStart}
                            pageSize={PAGE_SIZE}
                            onChange={setPage}
                        />
                    )}
                </div>

                {/* Panel detalle */}
                <DetallePanel
                    solicitud={seleccionada}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />
            </div>
        </div>
    );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────

function KpiCard({
    color,
    label,
    value,
    foot,
}: {
    color: string;
    label: string;
    value: string;
    foot?: string;
}) {
    return (
        <div className={`bg-white border border-[#0D0D0D]/10 border-l-4 ${color} p-4`}>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/50">
                {label}
            </p>
            <p className="mt-2 text-3xl font-bold text-[#012340]">{value}</p>
            {foot && <p className="mt-1 text-xs text-[#0D0D0D]/50">{foot}</p>}
        </div>
    );
}

/**
 * Paginador simple para la tabla. Muestra hasta 5 botones numerados con
 * elipsis cuando hay más, más Anterior/Siguiente.
 */
function Paginator({
    page,
    totalPages,
    totalRows,
    pageStart,
    pageSize,
    onChange,
}: {
    page: number;
    totalPages: number;
    totalRows: number;
    pageStart: number;
    pageSize: number;
    onChange: (p: number) => void;
}) {
    const from = pageStart + 1;
    const to = Math.min(pageStart + pageSize, totalRows);

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-[#0D0D0D]/10 text-xs text-[#0D0D0D]/60">
            <div>
                Mostrando <span className="font-semibold text-[#0D0D0D]">{from}</span>–
                <span className="font-semibold text-[#0D0D0D]">{to}</span> de{" "}
                <span className="font-semibold text-[#0D0D0D]">{totalRows}</span>
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onChange(page - 1)}
                    disabled={page <= 1}
                    className="inline-flex items-center justify-center h-8 w-8 border border-[#0D0D0D]/15 text-[#0D0D0D]/70 hover:border-[#012340] hover:text-[#012340] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página anterior"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageItems(page, totalPages).map((item, i) =>
                    item === "..." ? (
                        <span
                            key={`ellipsis-${i}`}
                            className="inline-flex items-center justify-center h-8 w-8 text-[#0D0D0D]/40"
                        >
                            …
                        </span>
                    ) : (
                        <button
                            key={item}
                            onClick={() => onChange(item)}
                            className={`inline-flex items-center justify-center h-8 min-w-[32px] px-2 text-xs font-medium border transition-colors ${
                                item === page
                                    ? "bg-[#012340] text-white border-[#012340]"
                                    : "bg-white text-[#0D0D0D]/70 border-[#0D0D0D]/15 hover:border-[#012340] hover:text-[#012340]"
                            }`}
                        >
                            {item}
                        </button>
                    ),
                )}

                <button
                    onClick={() => onChange(page + 1)}
                    disabled={page >= totalPages}
                    className="inline-flex items-center justify-center h-8 w-8 border border-[#0D0D0D]/15 text-[#0D0D0D]/70 hover:border-[#012340] hover:text-[#012340] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Página siguiente"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

/**
 * Calcula qué páginas mostrar en el paginador. Siempre incluye 1 y la última,
 * la actual y sus vecinas. Usa "..." para los huecos.
 */
function getPageItems(current: number, total: number): (number | "...")[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const items: (number | "...")[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) items.push("...");
    for (let i = start; i <= end; i++) items.push(i);
    if (end < total - 1) items.push("...");
    items.push(total);
    return items;
}

function ScoreChip({
    score,
    sinMotor,
    estado,
}: {
    score: number | null;
    sinMotor: boolean;
    estado: SolicitudEstado;
}) {
    if (sinMotor) {
        return (
            <span className="inline-flex items-center justify-center min-w-[40px] h-6 px-2 text-[10px] font-medium text-[#0D0D0D]/40 border border-dashed border-[#0D0D0D]/20">
                sin motor
            </span>
        );
    }
    if (score === null) {
        return (
            <span className="inline-flex items-center justify-center min-w-[40px] h-6 px-2 text-xs font-medium text-[#0D0D0D]/40 border border-[#0D0D0D]/10">
                —
            </span>
        );
    }
    const tone =
        estado === "rechazado"
            ? "bg-red-50 text-red-700 border-red-200"
            : estado === "aprobado" || estado === "desembolsado"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200";
    return (
        <span
            className={`inline-flex items-center justify-center min-w-[44px] h-6 px-2 text-xs font-bold border ${tone}`}
        >
            {score}
        </span>
    );
}

function DetallePanel({
    solicitud,
    activeTab,
    setActiveTab,
}: {
    solicitud: SolicitudUI | null;
    activeTab: "campos" | "motor_json" | "respuesta";
    setActiveTab: (t: "campos" | "motor_json" | "respuesta") => void;
}) {
    if (!solicitud) {
        return (
            <div className="bg-white border border-[#0D0D0D]/10 p-8 flex items-center justify-center text-sm text-[#0D0D0D]/40 min-h-[400px]">
                Selecciona una solicitud para ver el detalle.
            </div>
        );
    }

    return (
        // Altura fija con flex column. El contenedor de tabs hace flex-1 +
        // overflow-hidden, y el JSON/lista de campos hace overflow-auto dentro.
        // Así el panel completo no crece más allá de la pantalla y el JSON
        // (que puede medir miles de líneas) se queda con scroll interno.
        <div className="bg-white border border-[#0D0D0D]/10 flex flex-col h-[calc(100vh-280px)] min-h-[480px]">
            {/* Tabs */}
            <div className="flex items-center border-b border-[#0D0D0D]/10 px-2 flex-shrink-0">
                {[
                    { id: "campos", label: "Campos clave" },
                    { id: "motor_json", label: "motor_process (JSON)" },
                    { id: "respuesta", label: "Respuesta completa" },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={`relative px-4 py-3 text-xs font-medium tracking-wider transition-colors ${
                            activeTab === t.id
                                ? "text-[#012340]"
                                : "text-[#0D0D0D]/50 hover:text-[#0D0D0D]"
                        }`}
                    >
                        {t.label}
                        {activeTab === t.id && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#012340]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Cabecera */}
            <div
                className={`border-b border-[#0D0D0D]/10 p-5 flex items-start justify-between gap-4 flex-shrink-0 ${
                    solicitud.sinMotor
                        ? "bg-amber-50/60"
                        : "bg-gradient-to-r from-emerald-50 to-emerald-100/40"
                }`}
            >
                <div className="flex-1 min-w-0">
                    <p
                        className={`text-[10px] font-bold tracking-[0.18em] uppercase ${
                            solicitud.sinMotor ? "text-amber-700" : "text-emerald-700"
                        }`}
                    >
                        Resultado motor_process
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-[#012340]">
                        {solicitud.decisionTexto}
                    </h2>
                    <p className="mt-1 text-xs text-[#0D0D0D]/60 truncate">
                        <span className="font-semibold">{solicitud.solicitante}</span>{" "}
                        · CC {solicitud.cedula} · Radicado{" "}
                        <span className="font-mono">{solicitud.radicado}</span>
                    </p>
                </div>
                <div className="bg-[#012340] text-white p-3 min-w-[88px] text-center">
                    <p className="text-[9px] font-bold tracking-[0.18em] uppercase opacity-80">
                        Score motor
                    </p>
                    <p className="text-2xl font-bold">
                        {solicitud.score ?? "—"}
                    </p>
                </div>
            </div>

            {/* Contenido — flex-1 + overflow-auto = scroll interno */}
            <div className="flex-1 overflow-auto min-h-0">
                {activeTab === "campos" && <CamposClave solicitud={solicitud} />}
                {activeTab === "motor_json" && (
                    <MotorJsonView solicitud={solicitud} />
                )}
                {activeTab === "respuesta" && (
                    <JsonView
                        data={{
                            valida1_requests: solicitud.raw.valida1,
                            motor_process: solicitud.raw.motor_process,
                            motor_data: solicitud.raw.motor_data,
                            identity_validations: solicitud.raw.identity_validation,
                        }}
                    />
                )}
            </div>
        </div>
    );
}

function CamposClave({ solicitud }: { solicitud: SolicitudUI }) {
    return (
        <div className="p-5">
            {solicitud.sinMotor && (
                <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                        Esta solicitud aún no tiene registro en{" "}
                        <span className="font-mono font-semibold">motor_process</span>.
                        Mostrando solo las validaciones iniciales (valida1).
                    </span>
                </div>
            )}
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/50 mb-3">
                Validaciones
            </p>
            <div className="flex flex-col gap-2">
                {solicitud.validaciones.map((v) => (
                    <div
                        key={v.key}
                        className="flex items-center gap-3 px-4 py-3 border border-[#0D0D0D]/10 bg-white"
                    >
                        <ValidationIcon estado={v.estado} />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0D0D0D] truncate">
                                {v.label}
                            </p>
                            <p className="text-[11px] text-[#0D0D0D]/50 font-mono">
                                {v.key}
                            </p>
                        </div>
                        <span className="text-sm font-semibold text-[#0D0D0D]/40 min-w-[20px] text-right">
                            {v.estado === 1 ? "1" : v.estado === 2 ? "2" : "—"}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MotorJsonView({ solicitud }: { solicitud: SolicitudUI }) {
    if (solicitud.sinMotor || !solicitud.raw.motor_process) {
        return (
            <div className="p-5">
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-800">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">No existe motor_process para este registro</p>
                        <p className="mt-1 text-xs">
                            La solicitud todavía no ha sido procesada por el motor de
                            decisión, o el proceso no llegó a generar un registro en la
                            tabla <span className="font-mono">motor_process</span>.
                        </p>
                        <p className="mt-2 text-xs text-amber-700">
                            Estado derivado solo de{" "}
                            <span className="font-mono font-semibold">valida1_requests</span>:{" "}
                            <span className="font-semibold">{solicitud.decisionTexto}</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    return <JsonView data={solicitud.raw.motor_process} />;
}

function ValidationIcon({ estado }: { estado: 1 | 2 | null }) {
    if (estado === 1)
        return <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />;
    if (estado === 2)
        return <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />;
    return <MinusCircle className="h-5 w-5 text-[#0D0D0D]/30 flex-shrink-0" />;
}

function JsonView({ data }: { data: any }) {
    if (data === null || data === undefined) {
        return (
            <div className="p-5 text-sm text-[#0D0D0D]/40 italic">
                No hay datos.
            </div>
        );
    }
    const formatted = JSON.stringify(data, jsonReplacer, 2);
    return (
        <pre className="p-5 text-xs font-mono text-[#0D0D0D]/80 whitespace-pre-wrap break-words bg-[#FAFAFA] m-0">
            {formatted}
        </pre>
    );
}

/**
 * Si los campos request_json/response_json/api_responses vienen como string
 * JSON dentro de un JSON, los parseamos para que se muestren legibles.
 */
function jsonReplacer(_key: string, value: any) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (
            (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))
        ) {
            try {
                return JSON.parse(trimmed);
            } catch {
                return value;
            }
        }
    }
    return value;
}

function formatCurrency(v: number): string {
    if (!Number.isFinite(v)) return "$0";
    return "$" + new Intl.NumberFormat("es-CO").format(Math.round(v));
}

function formatFecha(iso: string): string {
    if (!iso) return "—";
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return iso;
    return `${m[3]}-${m[2]}-${m[1]}`;
}