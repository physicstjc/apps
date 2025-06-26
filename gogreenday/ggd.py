import streamlit as st
import pandas as pd
import os

st.set_page_config(page_title="🏢 Tampines Block Explorer", layout="wide")

st.markdown("""
    <h1 style='text-align: center;'>🏢 Tampines HDB Block Explorer</h1>
    <p style='text-align: center;'>Filter by <strong>Area</strong> and <strong>Class</strong>. Blocks are selected by default. Totals update live.</p>
    <hr>
""", unsafe_allow_html=True)

# Get script directory
script_dir = os.path.dirname(os.path.abspath(__file__))

# --- Load HDB block data ---
@st.cache_data
def load_blocks():
    df = pd.read_csv(os.path.join(script_dir, "HDBPropertyInformation.csv"))
    df.columns = [col.lower().strip() for col in df.columns]

    required = ["blk_no", "street", "max_floor_lvl", "total_dwelling_units", "bldg_contract_town"]
    for col in required:
        if col not in df.columns:
            st.error(f"Missing column: {col}")
            st.stop()

    df = df[df["bldg_contract_town"] == "TAP"].copy()
    df["blk_no"] = df["blk_no"].astype(str).str.strip()
    df["max_floor_lvl"] = pd.to_numeric(df["max_floor_lvl"], errors="coerce")
    df["total_dwelling_units"] = pd.to_numeric(df["total_dwelling_units"], errors="coerce")
    return df

# --- Load area.csv and expand blocks ---
@st.cache_data
def load_area_blocks():
    df = pd.read_csv(os.path.join(script_dir, "area.csv"))
    df.columns = [col.strip() for col in df.columns]

    if not {"Area", "Blocks", "Class"}.issubset(df.columns):
        st.error("❌ 'area.csv' must include 'Area', 'Blocks', and 'Class' columns.")
        st.stop()

    def expand_blocks(row):
        area = row["Area"]
        class_name = row["Class"]
        blocks_text = str(row["Blocks"]).replace("Tampines Blk", "").replace(")", "")
        blk_list = [blk.strip() for blk in blocks_text.split(",")]
        return pd.DataFrame({"area": area, "class": class_name, "blk_no": blk_list})

    return pd.concat([expand_blocks(row) for _, row in df.iterrows()], ignore_index=True)

# Load data
blocks_df = load_blocks()
area_blocks_df = load_area_blocks()

# --- AREA & CLASS selection UI ---
st.subheader("📍 Select Area and Class")

col1, col2 = st.columns(2)

area_options = sorted(area_blocks_df["area"].unique())
selected_area = col1.selectbox("Area", area_options)

# Filter class options for this area
filtered_classes = area_blocks_df[area_blocks_df["area"] == selected_area]["class"].unique()
selected_class = col2.selectbox("Class", sorted(filtered_classes))

# --- Filter blocks by area & class ---
blk_nos = area_blocks_df[
    (area_blocks_df["area"] == selected_area) &
    (area_blocks_df["class"] == selected_class)
]["blk_no"]

filtered_blocks = blocks_df[blocks_df["blk_no"].isin(blk_nos)].copy()

if filtered_blocks.empty:
    st.warning("No blocks found for this area/class combination.")
    st.stop()

# --- Add 'Select' column (checked by default)
filtered_blocks["Select"] = True

# --- Display table
st.subheader(f"🏘️ Blocks in Area {selected_area} – Class {selected_class}")

edited_df = st.data_editor(
    filtered_blocks[["Select", "blk_no", "street", "max_floor_lvl", "total_dwelling_units"]],
    num_rows="dynamic",
    use_container_width=True,
    key=f"editor_{selected_area}_{selected_class}"
)

# --- Filter selected
selected_df = edited_df[edited_df["Select"] == True]

# --- Results section
st.markdown("---")
st.subheader(f"✅ {len(selected_df)} block(s) selected")

if not selected_df.empty:
    st.dataframe(selected_df[["blk_no", "street", "max_floor_lvl", "total_dwelling_units"]])

    total_units = selected_df["total_dwelling_units"].sum()

    st.markdown(f"""
        <div style='background-color: #f0f8ff; padding: 1.2em; border-radius: 10px; text-align: center;'>
            <h2 style='color: #0078D4;'>Total Dwelling Units</h2>
            <h1 style='font-size: 3em; color: #003366;'>{int(total_units):,}</h1>
        </div>
    """, unsafe_allow_html=True)
else:
    st.info("No blocks selected.")
