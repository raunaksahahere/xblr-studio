import xml.etree.ElementTree as ET
from xml.dom import minidom

def generate_xbrl(output_path, company_name, cin, gross_receipts, paid_up_capital):
    # Create the root element with all standard namespaces
    root = ET.Element("xbrli:xbrl", {
        "xmlns:xbrli": "http://www.xbrl.org/2003/instance",
        "xmlns:link": "http://www.xbrl.org/2003/linkbase",
        "xmlns:xlink": "http://www.w3.org/1999/xlink",
        "xmlns:mca-indas": "http://www.mca.gov.in/2015/taxonomy/ind-AS",
        "xmlns:iso4217": "http://www.xbrl.org/2003/iso4217"
    })

    # 1. Add schemaRef
    schema_ref = ET.SubElement(root, "link:schemaRef", {
        "xlink:type": "simple",
        "xlink:href": "http://www.mca.gov.in/2015/taxonomy/ind-AS/mca-ind-AS-2015.xsd"
    })

    # 2. Add Context: Instant (for Paid-Up Capital and static details)
    context_instant = ET.SubElement(root, "xbrli:context", {"id": "I2025"})
    entity_instant = ET.SubElement(context_instant, "xbrli:entity")
    identifier_instant = ET.SubElement(entity_instant, "xbrli:identifier", {
        "scheme": "http://www.mca.gov.in/CIN"
    })
    identifier_instant.text = cin
    period_instant = ET.SubElement(context_instant, "xbrli:period")
    instant = ET.SubElement(period_instant, "xbrli:instant")
    instant.text = "2025-03-31"

    # 3. Add Context: Duration (for Gross Receipts)
    context_duration = ET.SubElement(root, "xbrli:context", {"id": "D2025"})
    entity_duration = ET.SubElement(context_duration, "xbrli:entity")
    identifier_duration = ET.SubElement(entity_duration, "xbrli:identifier", {
        "scheme": "http://www.mca.gov.in/CIN"
    })
    identifier_duration.text = cin
    period_duration = ET.SubElement(context_duration, "xbrli:period")
    start_date = ET.SubElement(period_duration, "xbrli:startDate")
    start_date.text = "2024-04-01"
    end_date = ET.SubElement(period_duration, "xbrli:endDate")
    end_date.text = "2025-03-31"

    # 4. Add Unit
    unit = ET.SubElement(root, "xbrli:unit", {"id": "INR"})
    measure = ET.SubElement(unit, "xbrli:measure")
    measure.text = "iso4217:INR"

    # 5. Add Facts
    # Paid Up Capital
    fact_cap = ET.SubElement(root, "mca-indas:PaidUpValueOfShareCapital", {
        "unitRef": "INR",
        "decimals": "2",
        "contextRef": "I2025"
    })
    fact_cap.text = f"{paid_up_capital:.2f}"

    # Gross Receipts
    fact_receipts = ET.SubElement(root, "mca-indas:GrossReceiptsOfCompany", {
        "unitRef": "INR",
        "decimals": "2",
        "contextRef": "D2025"
    })
    fact_receipts.text = f"{gross_receipts:.2f}"

    # Name of Company
    fact_name = ET.SubElement(root, "mca-indas:NameOfCompany", {
        "contextRef": "I2025"
    })
    fact_name.text = company_name

    # Corporate Identity Number
    fact_cin = ET.SubElement(root, "mca-indas:CorporateIdentityNumber", {
        "contextRef": "I2025"
    })
    fact_cin.text = cin

    # Format XML nicely using minidom
    xml_str = ET.tostring(root, 'utf-8')
    parsed_xml = minidom.parseString(xml_str)
    pretty_xml = parsed_xml.toprettyxml(indent="  ", encoding="utf-8")

    with open(output_path, "wb") as f:
        f.write(pretty_xml)

    print(f"[OK] Generated MCA-compliant XBRL XML: {output_path}")

if __name__ == "__main__":
    generate_xbrl(
        "reliance_xbrl_fy24_25.xml",
        "Golden Bio Energy Limited",
        "U56290DL2021PLC381173",
        424290053.42,
        72200000.0
    )
