import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'

interface StatTableProps<T extends object> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
}

export default function StatTable<T extends object>({ columns, data }: StatTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-[#0d1b2a] text-white sticky top-0 z-10">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left font-semibold whitespace-nowrap cursor-pointer select-none hover:bg-[#162c44] transition-colors"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <span className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && <span>↑</span>}
                    {header.column.getIsSorted() === 'desc' && <span>↓</span>}
                    {!header.column.getIsSorted() && header.column.getCanSort() && (
                      <span className="opacity-30">⇅</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-gray-400 italic"
              >
                No data available
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                className={`hover:bg-purple-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 whitespace-nowrap text-gray-800">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
