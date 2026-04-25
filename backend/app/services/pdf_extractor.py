from __future__ import annotations
import base64
import uuid
import fitz  # PyMuPDF
from app.models.schemas import BBox, PDFBlock, PageBlocks


def extract_pdf(pdf_bytes: bytes) -> list[PageBlocks]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: list[PageBlocks] = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        w = page.rect.width
        h = page.rect.height
        blocks: list[PDFBlock] = []

        raw = page.get_text("dict")
        for block in raw.get("blocks", []):
            bbox_raw = block.get("bbox", [0, 0, 0, 0])
            normalized = BBox(
                x0=bbox_raw[0] / w,
                y0=bbox_raw[1] / h,
                x1=bbox_raw[2] / w,
                y1=bbox_raw[3] / h,
            )

            if block.get("type") == 0:  # text block
                lines = block.get("lines", [])
                text_parts = []
                for line in lines:
                    for span in line.get("spans", []):
                        text_parts.append(span.get("text", ""))
                text = " ".join(text_parts).strip()
                if text:
                    blocks.append(
                        PDFBlock(
                            id=str(uuid.uuid4()),
                            type="text",
                            bbox=normalized,
                            text=text,
                        )
                    )

            elif block.get("type") == 1:  # image block
                img_list = page.get_images(full=True)
                for img_info in img_list:
                    xref = img_info[0]
                    base_img = doc.extract_image(xref)
                    img_bytes = base_img["image"]
                    b64 = base64.b64encode(img_bytes).decode("utf-8")
                    blocks.append(
                        PDFBlock(
                            id=str(uuid.uuid4()),
                            type="image",
                            bbox=normalized,
                            image_data=b64,
                        )
                    )
                    break  # one image per block ref

        pages.append(PageBlocks(page_num=page_idx + 1, blocks=blocks))

    doc.close()
    return pages
