/** The server's message for one field. Announced to screen readers as soon as it appears. */
export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-danger">
      {message}
    </p>
  );
}
