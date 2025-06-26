import streamlit as st
import pandas as pd

st.set_page_config(page_title="Tampines HDB Block Explorer", layout="wide")
st.title("🏢 Tampines HDB Block Explorer (from CSV)")

# Load CSV and process
@st.cache_data
def load_data():
    df = pd.read_csv("HDBPropertyInformation.csv")
    df.columns = [col.lower().strip() for col in df.columns]

    # Define expected column names
    col = {
        "block": "blk_no",
        "street_name": "street_name",
        "floors": "no_of_floors" if "no_of_floors" in df.columns else None,
        "lifts": "no_of_lifts" if "no_of_lifts" in df.columns else None,
        "units": "total_dwelling_units" if "total_dwelling_units" in df.columns else None,
        "contract_town": "bldg_contract_town"
    }

    # Filter to Tampines blocks (TAP)
    df = df[df[col["contract_town"]] == "TAP"]

    # Convert numeric fields
    if col["floors"]:
        df[col["floors"]] = pd.to_numeric(df[col["floors"]], errors="coerce")
    if col["units"]:
        df[col["units"]] = pd.to_numeric(df[col["units"]], errors="coerce")

    return df.reset_index(drop=True), col

# Load data
df, col = load_data()

if df.empty:
    st.warning("No Tampines (TAP) blocks found.")
    st.stop()

# Selection UI
st.subheader("✅ Select Blocks to View")

selected_rows = []
for i, row in df.iterrows():
    label = f"{row[col['block']]} {row[col['street_name']]}"

    # Add extra info
    extras = []
    if col["floors"]: extras.append(f"Floors: {row.get(col['floors'], 'N/A')}")
    if col["lifts"]:  extras.append(f"Lifts: {row.get(col['lifts'], 'N/A')}")
    if col["units"]: extras.append(f"Units: {row.get(col['units'], 'N/A')}")
    if extras: label += " | " + ", ".join(extras)

    if st.checkbox(label, key=i):
        selected_rows.append(row)

# Display results
st.markdown("---")
st.subheader(f"🔢 {len(selected_rows)} block(s) selected")

if selected_rows:
    selected_df = pd.DataFrame(selected_rows)

    # Display table
    st.dataframe(selected_df[[col["block"], col["street_name"], col["floors"], col["lifts"], col["units"]]])

    # Sum of dwelling units
    if col["units"]:
        total_units = selected_df[col["units"]].sum(skipna=True)
        st.success(f"🏘️ Total Dwelling Units in selected blocks: **{int(total_units)}**")
else:
    st.info("No blocks selected yet.")
