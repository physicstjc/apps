import streamlit as st
import pandas as pd
import requests
import matplotlib.pyplot as plt
from datetime import datetime

# Set up page
st.set_page_config(page_title="COE Premiums Over Time", layout="centered")
st.title("📊 COE Premiums by Vehicle Class and Year")

# Dataset from Data.gov.sg
dataset_id = "d_69b3380ad7e51aff3a7dcc84eba52b8a"
url = f"https://data.gov.sg/api/action/datastore_search?resource_id={dataset_id}&limit=10000"

# Fetch data
@st.cache_data
def load_data():
    response = requests.get(url)
    records = response.json()["result"]["records"]
    df = pd.DataFrame(records)
    # Parse date and premium
    df["date"] = pd.to_datetime(df["month"])
    df["year"] = df["date"].dt.year
    df["premium"] = pd.to_numeric(df["quota_premium"], errors='coerce')
    return df.dropna(subset=["premium"])

df = load_data()

# Dropdown for vehicle classes
vehicle_classes = sorted(df["vehicle_class"].unique())
selected_class = st.selectbox("Select Vehicle Class", vehicle_classes)

# Filter data
filtered = df[df["vehicle_class"] == selected_class]

# Plotting
fig, ax = plt.subplots(figsize=(10, 5))
for year in sorted(filtered["year"].unique()):
    yearly_data = filtered[filtered["year"] == year]
    ax.plot(yearly_data["date"].dt.strftime("%m-%d"), yearly_data["premium"],
            label=str(year), marker='o', linewidth=2)

ax.set_title(f"COE Premiums for {selected_class}")
ax.set_xlabel("Date (MM-DD)")
ax.set_ylabel("Premium (S$)")
ax.legend(title="Year", bbox_to_anchor=(1.05, 1), loc='upper left')
plt.xticks(rotation=45)
plt.tight_layout()

st.pyplot(fig)
