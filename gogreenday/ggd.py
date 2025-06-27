import os
import streamlit as st
import pandas as pd
from collections import defaultdict

st.set_page_config(page_title="🏢 Tampines Block Explorer", layout="wide")

st.markdown("""
    <h1 style='text-align: center;'>🏢 Tampines HDB Block Explorer</h1>
    <p style='text-align: center;'>Filter by <strong>Class</strong>. Blocks are pre-selected. Totals update live. You can also toggle Google Maps links.</p>
    <hr>
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

# Build pairing info
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

# Sidebar class selection
st.subheader("📍 Filter by Class")
class_options = sorted(area_blocks_df["class"].dropna().unique())
selected_class = st.selectbox("Class", class_options)

# Display pairing info
paired_with = paired_class_statements.get(selected_class)
if paired_with:
    st.info(f"🔗 Class **{selected_class}** is paired with: **{paired_with}**")

# Get all blocks associated with this class
blk_nos = area_blocks_df[
    area_blocks_df["class"].str.contains(selected_class, case=False, na=False)
]["blk_no"].unique()

filtered_blocks = blocks_df[blocks_df["blk_no"].isin(blk_nos)].copy()

# Add Select column and Google Maps column
filtered_blocks["Select"] = True
filtered_blocks["Google Maps"] = filtered_blocks.apply(
    lambda row: f"https://www.google.com/maps/search/Blk+{row['blk_no'].replace(' ', '+')}+{row['street'].replace(' ', '+')}",
    axis=1
)

# Google Maps link toggle
show_map_links = st.checkbox("Show Google Maps column", value=True)

# Determine which columns to show
columns_to_show = ["Select", "blk_no", "street", "max_floor_lvl", "total_dwelling_units"]
if show_map_links:
    columns_to_show.insert(2, "Google Maps")

# Final block table
st.subheader(f"🏘️ Blocks in Class '{selected_class}'")
edited_df = st.data_editor(
    filtered_blocks[["Select", "blk_no", "Google Maps", "street", "max_floor_lvl", "total_dwelling_units"]],
    column_order=columns_to_show,
    column_config={
        "Select": st.column_config.CheckboxColumn("Select", disabled=False),
        "blk_no": st.column_config.TextColumn("Block", disabled=True),
        "Google Maps": st.column_config.LinkColumn("Google Maps", display_text="View", disabled=True),
        "street": st.column_config.TextColumn("Street", disabled=True),
        "max_floor_lvl": st.column_config.NumberColumn("Max Floor", disabled=True),
        "total_dwelling_units": st.column_config.NumberColumn("Dwelling Units", disabled=True),
    },
    use_container_width=True,
    hide_index=True,
    disabled=True,
    key=f"editor_class_{selected_class}"
)

# Compute total
selected_df = edited_df[edited_df["Select"] == True]
total_units = selected_df["total_dwelling_units"].sum() if not selected_df.empty else 0

# Display total
st.markdown(f"""
    <div style='background-color: #f0f8ff; padding: 1.2em; border-radius: 10px; text-align: center;'>
        <h2 style='color: #0078D4;'>Total Dwelling Units</h2>
        <h1 style='font-size: 3em; color: #003366;'>{int(total_units):,}</h1>
    </div>
""", unsafe_allow_html=True)
