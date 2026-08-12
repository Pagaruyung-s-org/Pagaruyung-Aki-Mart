import { useState, useMemo } from 'react'

export function usePagination<T>(data: T[], defaultPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const totalItems = data?.length || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Ensure current page is valid when data changes
  const validCurrentPage = Math.min(currentPage, totalPages)

  const currentData = useMemo(() => {
    if (!data) return []
    const start = (validCurrentPage - 1) * pageSize
    return data.slice(start, start + pageSize)
  }, [data, validCurrentPage, pageSize])

  const goToNextPage = () => {
    if (validCurrentPage < totalPages) setCurrentPage(validCurrentPage + 1)
  }

  const goToPrevPage = () => {
    if (validCurrentPage > 1) setCurrentPage(validCurrentPage - 1)
  }

  return {
    currentPage: validCurrentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    currentData,
    totalItems,
    goToNextPage,
    goToPrevPage
  }
}
