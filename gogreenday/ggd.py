import streamlit as st
import pandas as pd
import os

st.set_page_config(page_title="🏢 Tampines Block Explorer", layout="wide")

st.markdown("""
    <h1 style='text-align: center;'>🏢 Tampines HDB Block Explorer</h1>
    <p style='text-align: center;'>Filter by <strong>Class</strong>. Blocks are pre-selected. Click a block to view it on <strong>Google Maps</strong>. Totals update live.</p>
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

# --- Load and expand area.csv ---
@st.cache_data
def load_area_blocks():
    df = pd.read_csv(os.path.join(script_dir, "area.csv"))
    df.columns = [col.strip() for col in df.columns]

    if not {"Blocks", "Class"}.issubset(df.columns):
        st.error("❌ 'area.csv' must include 'Blocks' and 'Class' columns.")
        st.stop()

    def expand_blocks(row):
        blocks_text = str(row["Blocks"]).replace("Tampines Blk", "").replace(")", "")
        class_list = [cls.strip() for cls in str(row["Class"]).split(",")]
        blk_list = [blk.strip() for blk in blocks_text.split(",")]
        return pd.DataFrame([
            {"class": cls, "blk_no": blk}
            for cls in class_list for blk in blk_list
        ])

    return pd.concat([expand_blocks(row) for _, row in df.iterrows()], ignore_index=True)

# Load data
blocks_df = load_blocks()
area_blocks_df = load_area_blocks()

# --- Class filter only ---
st.subheader("📍 Filter by Class")

class_options = sorted(area_blocks_df["class"].dropna().unique())
selected_class = st.selectbox("Class", class_options)

# --- Get matching blk_nos (partial match)
blk_nos = area_blocks_df[
    area_blocks_df["class"].astype(str).str.contains(selected_class, case=False, na=False)
]["blk_no"].unique()

# --- Get HDB block data
filtered_blocks = blocks_df[blocks_df["blk_no"].isin(blk_nos)].copy()

if filtered_blocks.empty:
    st.warning("No blocks found for this class.")
    st.stop()

# --- Add Google Maps links
def create_gmap_link(row):
    blk = row["blk_no"].replace(" ", "+")
    street = row["street"].replace(" ", "+")
    url = f"https://www.google.com/maps/search/Blk+{blk}+{street}"
    return f"[Blk {row['blk_no']}]({url})"

filtered_blocks["Google Maps"] = filtered_blocks.apply(create_gmap_link, axis=1)
filtered_blocks["Select"] = True

st.subheader(f"🏘️ Blocks matching Class '{selected_class}'")

# --- Show editable table
edited_df = st.data_editor(
    filtered_blocks[["Select", "Google Maps", "street", "max_floor_lvl", "total_dwelling_units"]],
    column_config={
        "Google Maps": st.column_config.LinkColumn("Block", display_text="Google Maps")
    },
    num_rows="dynamic",
    use_container_width=True,
    key=f"editor_class_{selected_class}"
)

# --- Compute total units for selected
selected_df = edited_df[edited_df["Select"] == True]
total_units = selected_df["total_dwelling_units"].sum() if not selected_df.empty else 0

st.markdown(f"""
    <div style='background-color: #f0f8ff; padding: 1.2em; border-radius: 10px; text-align: center;'>
        <h2 style='color: #0078D4;'>Total Dwelling Units</h2>
        <h1 style='font-size: 3em; color: #003366;'>{int(total_units):,}</h1>
    </div>
""", unsafe_allow_html=True)
