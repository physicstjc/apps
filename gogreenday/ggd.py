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

# --- Load HDB data ---
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

# --- Load and expand area.csv ---
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

# --- Filters: Area and Class ---
st.subheader("📍 Select Area and Class")

col1, col2 = st.columns(2)
area_options = sorted(area_blocks_df["area"].unique())
selected_area = col1.selectbox("Area", area_options)

class_options = sorted(area_blocks_df[area_blocks_df["area"] == selected_area]["class"].unique())
selected_class = col2.selectbox("Class", class_options)

# --- Filter blk_no list by Area AND substring match on Class
blk_nos = area_blocks_df[
    (area_blocks_df["area"] == selected_area) &
    (area_blocks_df["class"].astype(str).str.contains(selected_class, case=False, na=False))
]["blk_no"]

# --- Filter full block records
filtered_blocks = blocks_df[blocks_df["blk_no"].isin(blk_nos)].copy()

if filtered_blocks.empty:
    st.warning("No blocks found for this area/class combination.")
    st.stop()

# --- Add 'Select' column (pre-checked)
filtered_blocks["Select"] = True

st.subheader(f"🏘️ Blocks in Area {selected_area} – Class '{selected_class}'")

# --- Display editor table
edited_df = st.data_editor(
    filtered_blocks[["Select", "blk_no", "street", "max_floor_lvl", "total_dwelling_units"]],
    num_rows="dynamic",
    use_container_width=True,
    key=f"editor_{selected_area}_{selected_class}"
)

# --- Calculate total for selected blocks
selected_df = edited_df[edited_df["Select"] == True]
total_units = selected_df["total_dwelling_units"].sum() if not selected_df.empty else 0

st.markdown(f"""
    <div style='background-color: #f0f8ff; padding: 1.2em; border-radius: 10px; text-align: center;'>
        <h2 style='color: #0078D4;'>Total Dwelling Units</h2>
        <h1 style='font-size: 3em; color: #003366;'>{int(total_units):,}</h1>
    </div>
""", unsafe_allow_html=True)
