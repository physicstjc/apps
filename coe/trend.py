import streamlit as st
import pandas as pd
import requests

# Streamlit page setup
st.set_page_config(page_title="COE Premium Viewer", layout="centered")
st.title("📊 COE Premium Trends by Vehicle Class and Year")

# Load COE data
dataset_id = "d_69b3380ad7e51aff3a7dcc84eba52b8a"
url = f"https://data.gov.sg/api/action/datastore_search?resource_id={dataset_id}&limit=10000"

@st.cache_data
def load_data():
    response = requests.get(url)
    records = response.json()["result"]["records"]
    df = pd.DataFrame(records)

    # Process and clean
    df["date"] = pd.to_datetime(df["month"])
    df["year"] = df["date"].dt.year
    df["premium"] = pd.to_numeric(df["quota_premium"], errors="coerce")
    df = df.dropna(subset=["premium"])
    return df

df = load_data()

# Dropdown to select vehicle class
vehicle_classes = sorted(df["vehicle_class"].unique())
selected_class = st.selectbox("Select Vehicle Class", vehicle_classes)

# Filter data
filtered_df = df[df["vehicle_class"] == selected_class]

# Pivot for chart: Each year's premium vs month
filtered_df["month_day"] = filtered_df["date"].dt.strftime("%m-%d")
pivot_df = filtered_df.pivot(index="month_day", columns="year", values="premium")
pivot_df = pivot_df.sort_index()

# Display line chart
st.line_chart(pivot_df)
