import type { ToastContextValue } from '@sanity/ui/toast'

type ToastMessages = {
  pending?: string
  success: string
  error: string
}

/**
 * Runs a write and reports its outcome as a toast. Failures are logged and toasted
 * rather than thrown, so callers only need the returned success flag.
 */
export async function runWithToast(
  toast: ToastContextValue,
  write: () => Promise<unknown>,
  { pending, success, error }: ToastMessages
): Promise<boolean> {
  if (pending) {
    toast.push({ status: 'info', title: pending })
  }

  try {
    await write()
    toast.push({ status: 'success', title: success })

    return true
  } catch (err) {
    console.error(err)
    toast.push({
      status: 'error',
      title: error,
      ...(err instanceof Error && { description: err.message })
    })

    return false
  }
}
