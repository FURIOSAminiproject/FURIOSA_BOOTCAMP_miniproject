import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from pptx import Presentation
from pptx.util import Pt, Inches
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml import parse_xml

prs = Presentation(r"c:\furiosa-miniproject\FURIOSA_BOOTCAMP_miniproject\퓨리오사AIagent스쿨_미니프로젝트_IamyourJ_final_이지석_장동율.pptx")
slide7 = prs.slides[7]

# 슬라이드 7에서 이전 두꺼운 화살표(shape_type == 5 / RIGHT_ARROW) 삭제
for s in list(slide7.shapes):
    if s.shape_type == 5 or "화살표" in s.name or "Arrow" in s.name or (s.shape_type == 1 and s.width < 400000 and s.height < 500000):
        sp = s._element
        sp.getparent().remove(sp)

COLOR_ARROW = RGBColor(13, 148, 136) # #0D9488

def add_arrow_line(slide, x1, y1, x2, y2):
    conn = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    conn.line.color.rgb = COLOR_ARROW
    conn.line.width = Pt(2.5)
    tail = parse_xml('<a:tailEnd xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" type="triangle" w="med" len="med"/>')
    conn.line._ln.append(tail)
    return conn

# 5개 화살표 선 배치 (Y = 3755000)
Y_MID = 3755000
add_arrow_line(slide7, 1090000, Y_MID, 1480000, Y_MID)
add_arrow_line(slide7, 3560000, Y_MID, 3950000, Y_MID)
add_arrow_line(slide7, 4930000, Y_MID, 5340000, Y_MID)
add_arrow_line(slide7, 7570000, Y_MID, 7960000, Y_MID)
add_arrow_line(slide7, 10240000, Y_MID, 10630000, Y_MID)

prs.save(r"c:\furiosa-miniproject\FURIOSA_BOOTCAMP_miniproject\퓨리오사AIagent스쿨_미니프로젝트_IamyourJ_final_이지석_장동율.pptx")
print("Slide 7 arrows replaced with clean arrow lines successfully!")
