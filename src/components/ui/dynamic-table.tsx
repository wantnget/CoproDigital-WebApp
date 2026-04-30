"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ColumnDef {
    key: string;
    label: string;
    type?: "string" | "number" | "date" | "boolean" | "array" | "custom";
    sortable?: boolean;
    render?: (item: any) => React.ReactNode;
}

interface DynamicTableProps {
    data: any[];
    columns?: ColumnDef[];
    pageSize?: number;
    filterable?: boolean;
    groupable?: boolean;
}

export default function DynamicTable({
    data = [],
    columns,
    pageSize = 10,
    filterable = false,
}: DynamicTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
    const [filterQuery, setFilterQuery] = useState("");

    // Detect columns if not provided
    const cols: ColumnDef[] = useMemo(() => {
        if (columns && columns.length > 0) return columns;
        if (data.length === 0) return [];
        return Object.keys(data[0]).map((key) => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
            sortable: true,
            type: typeof data[0][key] as any,
        }));
    }, [data, columns]);

    // Derived states
    const filteredData = useMemo(() => {
        if (!filterQuery) return data;
        const q = filterQuery.toLowerCase();
        return data.filter((item) =>
            cols.some((col) => {
                const val = item[col.key];
                if (val == null) return false;
                return String(val).toLowerCase().includes(q);
            })
        );
    }, [data, cols, filterQuery]);

    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue == null) return sortConfig.direction === "asc" ? -1 : 1;
                if (bValue == null) return sortConfig.direction === "asc" ? 1 : -1;

                if (aValue < bValue) {
                    return sortConfig.direction === "asc" ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === "asc" ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
    const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleSort = (key: string) => {
        let direction: "asc" | "desc" = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const renderCell = (col: ColumnDef, item: any) => {
        if (col.render) return col.render(item);

        const val = item[col.key];
        if (val == null) return <span className="text-muted-foreground">-</span>;

        switch (col.type) {
            case "boolean":
                return (
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${val
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                    >
                        {val ? "Activo" : "Inactivo"}
                    </span>
                );
            case "date":
                return new Date(val).toLocaleDateString("es-CO");
            case "array":
                return Array.isArray(val) ? val.join(", ") : String(val);
            default:
                return String(val);
        }
    };

    return (
        <div className="flex flex-col space-y-4">
            {filterable && (
                <div className="flex items-center space-x-2">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar datos..."
                            value={filterQuery}
                            onChange={(e) => {
                                setFilterQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="pl-9 bg-white"
                        />
                    </div>
                </div>
            )}

            <div className="rounded-lg border border-[#0D0D0D]/10 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[#FAFAFA] hover:bg-[#FAFAFA]">
                                {cols.map((col) => (
                                    <TableHead
                                        key={col.key}
                                        className={`font-semibold text-[#012340] h-11 ${col.sortable ? "cursor-pointer select-none transition-colors hover:text-[#F29A2E]" : ""
                                            }`}
                                        onClick={() => col.sortable && handleSort(col.key)}
                                    >
                                        <div className="flex items-center space-x-1 whitespace-nowrap">
                                            <span>{col.label}</span>
                                            {col.sortable && (
                                                <span className="flex-shrink-0 text-muted-foreground">
                                                    {sortConfig?.key === col.key ? (
                                                        sortConfig.direction === "asc" ? (
                                                            <ChevronUp className="h-4 w-4 text-[#F29A2E]" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4 text-[#F29A2E]" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="h-4 w-4 opacity-30" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.length > 0 ? (
                                paginatedData.map((item, rowIndex) => (
                                    <TableRow key={rowIndex} className="transition-colors hover:bg-black/5">
                                        {cols.map((col, colIndex) => (
                                            <TableCell key={`${rowIndex}-${colIndex}`} className="py-3">
                                                {renderCell(col, item)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={cols.length} className="h-24 text-center text-sm text-muted-foreground">
                                        No se encontraron resultados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {data.length > 0 && (
                    <div className="flex items-center justify-between border-t border-[#0D0D0D]/10 px-4 py-3 bg-[#FAFAFA]">
                        <p className="text-xs text-muted-foreground">
                            Mostrando <span className="font-medium text-[#012340]">{(currentPage - 1) * pageSize + 1}</span> a{" "}
                            <span className="font-medium text-[#012340]">
                                {Math.min(currentPage * pageSize, sortedData.length)}
                            </span>{" "}
                            de <span className="font-medium text-[#012340]">{sortedData.length}</span> resultados
                        </p>
                        <div className="flex items-center space-x-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 p-0 disabled:opacity-50 border-[#0D0D0D]/10"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 p-0 disabled:opacity-50 border-[#0D0D0D]/10"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
