import streamlit as st
import pandas as pd

st.set_page_config(page_title="Tampines HDB Blocks", layout="wide")
st.title("🏢 Tampines HDB Block Explorer (from CSV)")

# Load local CSV file
@st.cache_data
def load_data():
    # Load CSV
    df = pd.read_csv("HDBPropertyInformation.csv")

    # Normalize column names
    df.columns = [col.lower().strip() for col in df.columns]

    # Confirm required columns exist
    required_cols = ["bldg_contract_town", "block", "street_name"]
    for col in required_cols:
        if col not in df.columns:
            st.error(f"Missing expected column: {col}")
            st.stop()

    # Filter to Tampines blocks
    df = df[df["bldg_contract_town"] == "TAP"]

    # Convert numeric columns if present
    df["no_of_floors"] = pd.to_numeric(df.get("no_of_floors", 0), errors="coerce")
    df["total_dwelling_units"] = pd.to_numeric(df.get("total_dwelling_units", 0), errors="coerce")

    return df.sort_values(by=["street_name", "block"]).reset_index(drop=True)

# Load data
df = load_data()

if df.empty:
    st.error("No Tampines blocks (TAP) found in the dataset.")
    st.stop()

# Selection UI
st.subheader("🔍 Select Blocks in Tampines (TAP)")
selected_rows = []

for i, row in df.iterrows():
    label = f"{row['block']} {row['street_name']} | Floors: {row.get('no_of_floors', 'N/A')}, Lifts: {row.get('no_of_lifts', 'N/A')}, Units: {row.get('total_dwelling_units', 'N/A')}"
    if st.checkbox(label, key=i):
        selected_rows.append(row)

# Display results
st.markdown("---")
st.subheader(f"✅ {len(selected_rows)} block(s) selected")

if selected_rows:
    selected_df = pd.DataFrame(selected_rows)
    st.dataframe(selected_df[["block", "street_name", "no_of_floors", "no_of_lifts", "total_dwelling_units"]])
else:
    st.info("Select blocks above to view their details.")
