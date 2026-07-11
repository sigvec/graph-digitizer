export default function formatTimestamp(isoString: string) {
    if (!isoString) return '(No timestamp)';
    return new Date(isoString).toLocaleString(
        undefined,
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }
    );
}