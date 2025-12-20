from __future__ import annotations

from io import BytesIO

import fitz


def pdf_bytes_to_png(pdf_bytes: bytes, *, scale: float = 2.0) -> BytesIO:
    with fitz.open(stream=pdf_bytes, filetype="pdf") as pdf_document:
        if pdf_document.page_count == 0:
            raise ValueError("PDF contains no pages.")

        # If multi-page, use only the first page (legacy behavior).
        page = pdf_document.load_page(0)
        matrix = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        png_bytes = pix.tobytes("png")

    return BytesIO(png_bytes)


