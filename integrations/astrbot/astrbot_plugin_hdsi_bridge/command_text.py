"""Recover only a verified slash removed by AstrBot's wake-prefix stage."""

def restore_command_prefix(normalized, original):
    text=(normalized or '').strip()
    raw=(original or '').strip()
    if raw.startswith('/') and raw[1:].strip()==text:
        return raw
    return text
