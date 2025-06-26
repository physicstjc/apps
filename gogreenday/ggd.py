import os
import streamlit as st
import pandas as pd

st.set_page_config(page_title="🏢 Tampines Block Explorer", layout="wide")

st.markdown("""
    <h1 style='text-align: center;'>🏢 Tampines HDB Block Explorer</h1>
    <p style='text-align: center;'>Filter by <strong>Class</strong>. Blocks are pre-selected. Totals update live. Google Maps links shown below.</p>
    <hr>
""", unsafe_allow_html=True)

# Get script directory
script_dir = os.path.dirname(os.path.abspath(__file__))

@st.cache_data
def load_blocks():
    df = pd.read_csv(os.path.join(script_dir, "HDBPropertyInformation.csv"))
    df.columns = [col.lower().strip() for col in df.columns]
    df = df[df["bldg_contract_town"] == "TAP"].copy()
    df["blk_no"] = df["blk_no"].astype(str).str.strip()
    df["max_floor_lvl"] = pd.to_numeric(df["max_floor_lvl"], errors="coerce")
    df["total_dwelling_units"] = pd.to_numeric(df["total_dwelling_units"], errors="coerce")
    return df

@st.cache_data
def load_area_blocks():
    df = pd.read_csv(os.path.join(script_dir, "area.csv"))
    df.columns = [col.strip() for col in df.columns]

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

# --- Class filter
st.subheader("📍 Filter by Class")

class_options = sorted(area_blocks_df["class"].dropna().unique())
selected_class = st.selectbox("Class", class_options)

blk_nos = area_blocks_df[
    area_blocks_df["class"].astype(str).str.contains(selected_class, case=False, na=False)
]["blk_no"].unique()

filtered_blocks = blocks_df[blocks_df["blk_no"].isin(blk_nos)].copy()

if filtered_blocks.empty:
    st.warning("No blocks found for this class.")
    st.stop()

# Add selection checkbox
filtered_blocks["Select"] = True

# Display editable block table
st.subheader(f"🏘️ Blocks matching Class '{selected_class}'")
edited_df = st.data_editor(
    filtered_blocks[["Select", "blk_no", "street", "max_floor_lvl", "total_dwelling_units"]],
    num_rows="dynamic",
    use_container_width=True,
    key=f"editor_class_{selected_class}"
)

# Total dwelling units
selected_df = edited_df[edited_df["Select"] == True]
total_units = selected_df["total_dwelling_units"].sum() if not selected_df.empty else 0

st.markdown(f"""
    <div style='background-color: #f0f8ff; padding: 1.2em; border-radius: 10px; text-align: center;'>
        <h2 style='color: #0078D4;'>Total Dwelling Units</h2>
        <h1 style='font-size: 3em; color: #003366;'>{int(total_units):,}</h1>
    </div>
""", unsafe_allow_html=True)

# Show Google Maps links for selected blocks
st.markdown("### 🗺️ Google Maps Links for Selected Blocks")
if not selected_df.empty:
    for _, row in selected_df.iterrows():
        blk = row["blk_no"].replace(" ", "+")
        street = row["street"].replace(" ", "+")
        url = f"https://www.google.com/maps/search/Blk+{blk}+{street}"
        st.markdown(f"- [Blk {row['blk_no']} - {row['street']}]({url})", unsafe_allow_html=True)
else:
    st.markdown("*No blocks selected.*")
