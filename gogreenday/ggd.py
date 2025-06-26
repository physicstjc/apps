import streamlit as st
import requests
import pandas as pd

# Load data from Data.gov.sg API
@st.cache_data
def load_data():
    url = "https://data.gov.sg/api/action/datastore_search?resource_id=d_17f5382f26140b1fdae0ba2ef6239d2f&limit=500"
    response = requests.get(url)
    records = response.json()["result"]["records"]
    df = pd.DataFrame(records)
    df = df[df["town"].str.lower() == "tampines"]
    return df

# App
st.title("🏢 Tampines HDB Blocks")

df = load_data()

# Sort by street/block for easier reading
df = df.sort_values(by=["street_name", "block"]).reset_index(drop=True)

# Multi-checkbox interface
selected_blocks = []
st.markdown("### Select blocks to display")

for i, row in df.iterrows():
    label = f'{row["block"]} {row["street_name"]} | Floors: {row.get("no_of_floors", "N/A")}, Lifts: {row.get("no_of_lifts", "N/A")}, Units: {row.get("total_dwelling_units", "N/A")}'
    if st.checkbox(label, key=i):
        selected_blocks.append(row)

# Show summary
st.markdown("---")
st.subheader(f"✅ {len(selected_blocks)} block(s) selected")

# Display selected blocks in a table
if selected_blocks:
    display_df = pd.DataFrame(selected_blocks)
    st.dataframe(display_df[["block", "street_name", "no_of_floors", "no_of_lifts", "total_dwelling_units"]])
else:
    st.info("Select blocks using the checkboxes above to view details.")

