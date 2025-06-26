import streamlit as st
import pandas as pd

st.set_page_config(page_title="Tampines HDB Blocks", layout="wide")
st.title("🏢 Tampines HDB Block Explorer (CSV Version)")

# Load local CSV file
@st.cache_data
def load_data():
    df = pd.read_csv("HDBPropertyInformation.csv")

    # Standardize column names
    df.columns = [col.lower().strip() for col in df.columns]

    # Filter blocks where street name contains "TAMPINES"
    df = df[df["street_name"].str.upper().str.contains("TAMPINES", na=False)]

    # Convert relevant columns for display
    df["no_of_floors"] = pd.to_numeric(df.get("no_of_floors", 0), errors='coerce')
    df["total_dwelling_units"] = pd.to_numeric(df.get("total_dwelling_units", 0), errors='coerce')

    return df.sort_values(by=["street_name", "block"]).reset_index(drop=True)

# Load data
df = load_data()

if df.empty:
    st.error("No Tampines blocks found in dataset.")
    st.stop()

# Checkbox selection UI
st.subheader("🔍 Select Blocks to View Details")

selected_rows = []
for i, row in df.iterrows():
    label = f"{row['block']} {row['street_name']} | Floors: {row.get('no_of_floors', 'N/A')}, Lifts: {row.get('no_of_lifts', 'N/A')}, Units: {row.get('total_dwelling_units', 'N/A')}"
    if st.checkbox(label, key=i):
        selected_rows.append(row)

# Display selected blocks
st.markdown("---")
st.subheader(f"✅ {len(selected_rows)} block(s) selected")

if selected_rows:
    selected_df = pd.DataFrame(selected_rows)
    st.dataframe(selected_df[["block", "street_name", "no_of_floors", "no_of_lifts", "total_dwelling_units"]])
else:
    st.info("No blocks selected yet. Use the checkboxes above to begin.")
