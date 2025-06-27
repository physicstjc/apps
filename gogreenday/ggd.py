import os
import streamlit as st
import pandas as pd
from collections import defaultdict

st.set_page_config(page_title="🏢 Tampines Block Explorer", layout="wide")

st.markdown("""
    <h1 style='text-align: center;'>🏢 Tampines HDB Block Explorer</h1>
    <p style='text-align: center;'>Filter by <strong>Class</strong>. View block data with optional Google Maps links.</p>
    <hr>
""", unsafe_allow_html=True)

st.markdown("""
<p style='text-align: center; font-size: 0.9em;'>
📊 Data source: <a href='https://data.gov.sg/datasets?query=hdb&resultId=d_17f5382f26140b1fdae0ba2ef6239d2f&page=1&dataExplorerPage=2&columnLegendPage=3' target='_blank'>
data.gov.sg HDB Property Information Dataset
</a>
</p>
""", unsafe_allow_html=True)

st.markdown("""
<style>
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 0.5em;
  border: 1px solid #ddd;
  text-align: center;
}
th {
  background-color: #f2f2f2;
}
a {
  text-decoration: none;
  color: #1a73e8;
}
</style>
""", unsafe_allow_html=True)

script_dir = os.path.dirname(os.path.abspath(__file__))

@st.cache_data
def load_blocks():
    df = pd.read_csv(os.path.join(script_dir, "HDBPropertyInformation.csv"))
    df.columns = [col.lower().strip() for col in df.columns]
    df = df[df["bldg_contract_town"] == "TAP"]
    df["blk_no"] = df["blk_no"].astype(str).str.strip()
    df["street"] = df["street"].astype(str).str.upper().str.strip()
    df["max_floor_lvl"] = pd.to_numeric(df["max_floor_lvl"], errors="coerce")
    df["total_dwelling_units"] = pd.to_numeric(df["total_dwelling_units"], errors="coerce")
    df = df[~df["street"].str.contains("SIMEI")]
    return df

@st.cache_data
def load_area_blocks():
    df = pd.read_csv(os.path.join(script_dir, "area.csv"))
    df.columns = ["Area", "Blocks", "No. of blocks", "Class"]

    def expand_blocks(row):
        blocks = str(row["Blocks"]).replace("Tampines Blk", "").replace(")", "")
        blk_list = [b.strip() for b in blocks.split(",")]
        class_list = [c.strip() for c in str(row["Class"]).split(",")]
        return pd.DataFrame([
            {"class": cls, "blk_no": blk}
            for cls in class_list for blk in blk_list
        ])

    return pd.concat([expand_blocks(row) for _, row in df.iterrows()], ignore_index=True), df

blocks_df = load_blocks()
area_blocks_df, full_area_df = load_area_blocks()

class_pairs = defaultdict(set)
for class_str in full_area_df["Class"]:
    classes = [cls.strip() for cls in str(class_str).split(",") if cls.strip()]
    if len(classes) > 1:
        for i in range(len(classes)):
            for j in range(i + 1, len(classes)):
                c1, c2 = classes[i], classes[j]
                class_pairs[c1].add(c2)
                class_pairs[c2].add(c1)

paired_class_statements = {
    cls: ", ".join(sorted(peers)) for cls, peers in class_pairs.items()
}

st.subheader("📍 Filter by Class")
class_options = sorted(area_blocks_df["class"].dropna().unique())
selected_class = st.selectbox("Class", class_options)

paired_with = paired_class_statements.get(selected_class)
if paired_with:
    st.info(f"🔗 Class **{selected_class}** is paired with: **{paired_with}**")

show_map_links = st.checkbox("Show Google Maps column", value=True)

blk_nos = area_blocks_df[
    area_blocks_df["class"].str.contains(selected_class, case=False, na=False)
]["blk_no"].unique()

filtered_blocks = blocks_df[blocks_df["blk_no"].isin(blk_nos)].copy()

# Generate HTML table
table_html = "<table><tr><th>Block</th>"
if show_map_links:
    table_html += "<th>Google Maps</th>"
table_html += "<th>Street</th><th>Max Floor</th><th>Dwelling Units</th></tr>"

for _, row in filtered_blocks.iterrows():
    block = row["blk_no"]
    street = row["street"]
    max_floor = int(row["max_floor_lvl"]) if not pd.isna(row["max_floor_lvl"]) else ""
    units = int(row["total_dwelling_units"]) if not pd.isna(row["total_dwelling_units"]) else ""
    gmap_link = f"https://www.google.com/maps/search/Blk+{block.replace(' ', '+')}+{street.replace(' ', '+')}"
    table_html += f"<tr><td>Blk {block}</td>"
    if show_map_links:
        table_html += f'<td><a href="{gmap_link}" target="_blank">Link</a></td>'
    table_html += f"<td>{street}</td><td>{max_floor}</td><td>{units}</td></tr>"

table_html += "</table>"
st.markdown(table_html, unsafe_allow_html=True)

total_units = filtered_blocks["total_dwelling_units"].sum()

st.markdown(f"""
    <div style='background-color: #f0f8ff; padding: 1.2em; border-radius: 10px; text-align: center;'>
        <h2 style='color: #0078D4;'>Total Dwelling Units</h2>
        <h1 style='font-size: 3em; color: #003366;'>{int(total_units):,}</h1>
    </div>
""", unsafe_allow_html=True)
