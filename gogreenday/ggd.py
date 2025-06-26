import streamlit as st
import requests
import pandas as pd

st.set_page_config(page_title="Tampines HDB Blocks", layout="wide")
st.title("🏢 Tampines HDB Block Explorer")

# Load and process data
@st.cache_data(show_spinner="Fetching HDB block data...")
def load_data():
    url = "https://data.gov.sg/api/action/datastore_search?resource_id=d_17f5382f26140b1fdae0ba2ef6239d2f&limit=1000"
    response = requests.get(url)
    if response.status_code != 200:
        st.error("Failed to fetch data from data.gov.sg")
        return pd.DataFrame()

    records = response.json().get("result", {}).get("records", [])
    df = pd.DataFrame(records)

    # Standardize column names
    df.columns = [col.lower() for col in df.columns]

    # Check for 'town' column
    if "town" not in df.columns:
        st.error("The expected 'town' column is missing in the dataset.")
        return pd.DataFrame()

    # Filter for Tampines
    df = df[df["town"].str.lower() == "tampines"]

    # Convert numerical fields (except no_of_lifts)
    df["no_of_floors"] = pd.to_numeric(df.get("no_of_floors", 0), errors='coerce')
    df["total_dwelling_units"] = pd.to_numeric(df.get("total_dwelling_units", 0), errors='coerce')

    return df.sort_values(by=["street_name", "block"]).reset_index(drop=True)

# Load dataset
df = load_data()

if df.empty:
    st.stop()

# Selection section
st.subheader("🔍 Select Blocks to View Details")

selected_rows = []
for i, row in df.iterrows():
    label = f"{row['block']} {row['street_name']} | Floors: {row.get('no_of_floors', 'N/A')}, Lifts: {row.get('no_of_lifts', 'N/A')}, Units: {row.get('total_dwelling_units', 'N/A')}"
    if st.checkbox(label, key=i):
        selected_rows.append(row)

# Results
st.markdown("---")
st.subheader(f"✅ {len(selected_rows)} block(s) selected")

if selected_rows:
    selected_df = pd.DataFrame(selected_rows)
    st.dataframe(selected_df[["block", "street_name", "no_of_floors", "no_of_lifts", "total_dwelling_units"]])
else:
    st.info("No blocks selected yet. Use the checkboxes above to begin.")
