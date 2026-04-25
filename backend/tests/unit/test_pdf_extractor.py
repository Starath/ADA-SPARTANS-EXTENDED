import io
import pytest
import fitz
from app.services.pdf_extractor import extract_pdf
from app.models.schemas import PageBlocks, PDFBlock
from PIL import Image

def make_pdf_with_image() -> bytes:
    """Buat PDF dengan satu image dummy 50x50 px"""
    img = Image.new("RGB", (50, 50), color=(255, 0, 0))
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)

    doc = fitz.open()
    page = doc.new_page(width=200, height=200)
    rect = fitz.Rect(25, 25, 75, 75)
    # Insert image dari bytes
    page.insert_image(rect, stream=img_bytes.read())

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()

def make_simple_pdf(text: str = "Hello World") -> bytes:
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((72, 72), text, fontsize=12)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


def test_extract_returns_page_blocks():
    pdf_bytes = make_simple_pdf("Fotosintesis adalah proses penting.")
    result = extract_pdf(pdf_bytes)
    assert isinstance(result, list)
    assert len(result) == 1
    assert isinstance(result[0], PageBlocks)


def test_text_blocks_have_text():
    pdf_bytes = make_simple_pdf("Buku ini bagus sekali.")
    result = extract_pdf(pdf_bytes)
    text_blocks = [b for b in result[0].blocks if b.type == "text"]
    assert len(text_blocks) > 0
    assert any("Buku" in (b.text or "") for b in text_blocks)


def test_bbox_normalized_between_0_and_1():
    pdf_bytes = make_simple_pdf("Test normalisasi bbox.")
    result = extract_pdf(pdf_bytes)
    for page in result:
        for block in page.blocks:
            assert 0 <= block.bbox.x0 <= 1
            assert 0 <= block.bbox.y0 <= 1
            assert 0 <= block.bbox.x1 <= 1
            assert 0 <= block.bbox.y1 <= 1


def test_multi_page_pdf():
    doc = fitz.open()
    for i in range(3):
        page = doc.new_page()
        page.insert_text((72, 72), f"Halaman {i+1}", fontsize=12)
    buf = io.BytesIO()
    doc.save(buf)
    result = extract_pdf(buf.getvalue())
    assert len(result) == 3
    assert result[0].page_num == 1
    assert result[2].page_num == 3


def test_empty_pdf_no_crash():
    doc = fitz.open()
    doc.new_page()
    buf = io.BytesIO()
    doc.save(buf)
    result = extract_pdf(buf.getvalue())
    assert len(result) == 1

def test_image_blocks_have_image_data():
    """Ensure image blocks contain non-empty base64 image_data."""
    pdf_bytes = make_pdf_with_image()
    pages = extract_pdf(pdf_bytes)

    found_image_block = False
    for page in pages:
        for block in page.blocks:
            if block.type == "image":
                found_image_block = True
                assert hasattr(block, "image_data")
                assert block.image_data is not None
                assert block.image_data.strip() != ""
                # bbox tetap normalisasi 0-1
                assert 0 <= block.bbox.x0 <= 1
                assert 0 <= block.bbox.y0 <= 1
                assert 0 <= block.bbox.x1 <= 1
                assert 0 <= block.bbox.y1 <= 1

    assert found_image_block, "No image block found in PDF"