import streamlit as st
import pandas as pd

st.set_page_config(page_title="Tampines HDB Block Explorer", layout="wide")
st.title("🏢 Tampines HDB Block Explorer by Area")

# --- Load and clean HDB data ---
@st.cache_data
def load_blocks():
    df = pd.read_csv("HDBPropertyInformation.csv")
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
    area_df = pd.read_csv("area.csv")
    area_df.columns = [col.lower().strip() for col in area_df.columns]

    if "area" not in area_df.columns or "blocks" not in area_df.columns:
        st.error("❌ 'area.csv' must contain 'Area' and 'Blocks' columns.")
        st.stop()

    def expand_blocks(row):
        area = row["area"]
        blocks_text = row["blocks"]
        cleaned = blocks_text.replace("Tampines Blk", "").replace(")", "")
        blk_list = [blk.strip() for blk in cleaned.split(",")]
        return pd.DataFrame({"area": area, "blk_no": blk_list})

    flattened = pd.concat([expand_blocks(row) for _, row in area_df.iterrows()], ignore_index=True)
    flattened["blk_no"] = flattened["blk_no"].astype(str)
    return flattened

# --- Load datasets ---
blocks_df = load_blocks()
area_map_df = load_area_blocks()

# --- Area selector ---
st.subheader("📍 Select Area")
area_choices = sorted(area_map_df["area"].unique())
selected_area = st.selectbox("Choose an area number:", area_choices)

# --- Filter by area ---
blk_nos_in_area = area_map_df[area_map_df["area"] == selected_area]["blk_no"]
filtered_blocks = blocks_df[blocks_df["blk_no"].isin(blk_nos_in_area)]

if filtered_blocks.empty:
    st.warning("No blocks found in this area.")
    st.stop()

# --- Block selection ---
st.subheader(f"✅ Blocks in Area {selected_area}")
selected_rows = []

for i, row in filtered_blocks.iterrows():
    label = f"{row['blk_no']} {row['street']} | Floors: {row['max_floor_lvl']}, Units: {row['total_dwelling_units']}"
    if st.checkbox(label, key=i):
        selected_rows.append(row)

# --- Output section ---
st.markdown("---")
st.subheader(f"🔢 {len(selected_rows)} block(s) selected")

if selected_rows:
    selected_df = pd.DataFrame(selected_rows)
    st.dataframe(selected_df[["blk_no", "street", "max_floor_lvl", "total_dwelling_units"]])
    total_units = selected_df["total_dwelling_units"].sum()
    st.success(f"🏘️ Total dwelling units: **{int(total_units)}**")
else:
    st.info("No blocks selected.")
