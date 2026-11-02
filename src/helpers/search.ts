type Searchable = {
  label: string
  keywords?: (string | undefined)[]
}

/** Options whose label or keywords contain the query anywhere, ignoring case. */
export function searchOptions<T extends Searchable>(options: T[], query: string): T[] {
  const needle = query.trim().toLowerCase()

  if (!needle) {
    return options
  }

  return options.filter(option =>
    [option.label, ...(option.keywords ?? [])].some(field => field?.toLowerCase().includes(needle))
  )
}
