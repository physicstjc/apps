import streamlit as st
import pandas as pd

st.set_page_config(page_title="Tampines HDB Block Explorer", layout="wide")
st.title("🏢 Tampines HDB Block Explorer (from CSV)")

# Load CSV
@st.cache_data
def load_data():
    df = pd.read_csv("HDBPropertyInformation.csv")
    df.columns = [col.lower().strip() for col in df.columns]

    # Expected columns
    required_cols = ["blk_no", "street", "max_floor_lvl", "total_dwelling_units", "bldg_contract_town"]
    for col in required_cols:
        if col not in df.columns:
            st.error(f"Missing column: {col}")
            st.stop()

    # Filter for Tampines (TAP)
    df = df[df["bldg_contract_town"] == "TAP"]

    # Clean up types
    df["max_floor_lvl"] = pd.to_numeric(df["max_floor_lvl"], errors="coerce")
    df["total_dwelling_units"] = pd.to_numeric(df["total_dwelling_units"], errors="coerce")

    return df.reset_index(drop=True)

# Load and filter data
df = load_data()

if df.empty:
    st.warning("No blocks found under bldg_contract_town = 'TAP'.")
    st.stop()

# UI for block selection
st.subheader("✅ Select Blocks")
selected = []

for i, row in df.iterrows():
    label = f"{row['blk_no']} {row['street']} | Floors: {row['max_floor_lvl']}, Units: {row['total_dwelling_units']}"
    if st.checkbox(label, key=i):
        selected.append(row)

# Display selected blocks and unit total
st.markdown("---")
st.subheader(f"🔢 {len(selected)} block(s) selected")

if selected:
    selected_df = pd.DataFrame(selected)
    st.dataframe(selected_df[["blk_no", "street", "max_floor_lvl", "total_dwelling_units"]])

    total_units = selected_df["total_dwelling_units"].sum()
    st.success(f"🏘️ Total dwelling units in selected blocks: **{int(total_units)}**")
else:
    st.info("No blocks selected.")
