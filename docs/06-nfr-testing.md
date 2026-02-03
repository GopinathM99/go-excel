# 06 Non-Functional Requirements and Testing

## Performance targets
- Open 1M-cell workbook in under 3 seconds on modern hardware.
- 60fps scrolling with virtualization.
- Recalculate 100k dependent cells in under 1 second.

## Reliability
- Autosave and crash recovery.
- No silent data loss; show explicit errors when data cannot be preserved.

## Security
- Access control per workbook and role.
- Encrypted storage for sensitive data.
- Audit logs for collaborative changes.

## Testing strategy
- Unit tests for formula functions and edge cases.
- Property-based tests for parser and evaluator.
- XLSX compatibility tests with a curated corpus.
- Performance regression tests for large sheets.
- Collaboration conflict resolution tests.

## Observability
- Client performance metrics (paint time, scroll jank).
- Server metrics (latency, operation queue length).
- Error reporting for formula parsing and file import.
