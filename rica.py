from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import streamlit.components.v1 as components
from bokeh import events
from bokeh.layouts import column, row
from bokeh.models import ColumnDataSource, CustomJS, Div
from nilearn import plotting
from nilearn.image import load_img
from streamlit_bokeh import streamlit_bokeh

import io_utils
from plotting import dynamic_plots

color_mapping = {"accepted": "#2ecc71", "rejected": "#e74c3c", "ignored": "#3498db"}


# Cache helpers -------------------------------------------------------------


@st.cache_data(show_spinner=False)
def load_comptable_data_dict(metrics_file_path: str):
    """Load the component table and return a plain serializable dict for fast reuse.

    We call the existing helper in `dynamic_plots` which returns a
    bokeh ColumnDataSource, then convert its `.data` into plain lists so
    Streamlit can cache it and we can quickly recreate a ColumnDataSource
    on rerun.
    """
    cds = dynamic_plots._create_data_struct(metrics_file_path)
    data = {}
    for k, v in cds.data.items():
        # Convert numpy arrays / pandas objects to plain lists
        try:
            data[k] = v.tolist()
        except Exception:
            # Fallback to list() for any iterable
            try:
                data[k] = list(v)
            except Exception:
                data[k] = v
    return data


@st.cache_data(show_spinner=False)
def render_nilearn_view_html(ica_nii_path: str, comp_index: int):
    """Return the HTML string for a nilearn view of a component.

    This avoids re-generating the interactive HTML on every rerun.
    """
    import numpy as _np
    from nilearn.image import index_img, load_img

    ica_img = load_img(ica_nii_path)
    comp_nii = index_img(ica_img, comp_index)
    vmax = _np.max(_np.abs(comp_nii.get_fdata())) * 0.1
    view = plotting.view_img(
        comp_nii,
        bg_img=None,
        vmax=vmax,
        colorbar=True,
        draw_cross=False,
        annotate=False,
        resampling_interpolation="nearest",
    )
    return view.html


@st.cache_data(show_spinner=False)
def make_ts_fig_dict(comp_ts_path: str, comp_col: str, line_color: str):
    """Create the time-series + FFT Plotly figure and return it as a plain dict.

    We cache the resulting figure dict so subsequent reruns can reconstruct
    the figure quickly without recomputing FFTs or traces.
    """
    import numpy as _np
    from plotly.subplots import make_subplots

    comp_ts_df_local = pd.read_csv(comp_ts_path, sep="\t", encoding="utf=8")
    ts_fig = make_subplots(
        rows=2,
        cols=1,
        subplot_titles=(f"Time Series {comp_col}", "One-sided FFT"),
        vertical_spacing=0.25,
    )
    ts_fig.add_trace(
        go.Scatter(
            y=comp_ts_df_local[comp_col],
            mode="lines",
            name="Time Series",
            line=dict(color=line_color),
        ),
        row=1,
        col=1,
    )
    ts_data = comp_ts_df_local[comp_col].values
    n = len(ts_data)
    freq = _np.fft.rfftfreq(n)
    fft_values = _np.fft.rfft(ts_data)
    ts_fig.add_trace(
        go.Scatter(
            x=freq,
            y=_np.abs(fft_values),
            mode="lines",
            name="One-sided FFT",
            line=dict(color=line_color),
        ),
        row=2,
        col=1,
    )
    ts_fig.update_layout(
        height=400, showlegend=False, margin=dict(t=20, b=10, l=40, r=40)
    )
    ts_fig.update_xaxes(title_text="Time (volumes)", row=1, col=1)
    ts_fig.update_xaxes(title_text="Frequency (Hz)", row=2, col=1)
    ts_fig.update_yaxes(title_text="Amplitude", row=1, col=1)
    ts_fig.update_yaxes(title_text="Amplitude", row=2, col=1)
    return ts_fig.to_dict()


def make_ts_fig_dict_from_df(
    comp_ts_df_local: pd.DataFrame, comp_col: str, line_color: str
):
    """Create the time-series + FFT Plotly figure from an in-memory DataFrame.

    This is used as a fallback when we don't have a filesystem path stored in
    session state (e.g. earlier state was persisted without the path).
    """
    import numpy as _np
    from plotly.subplots import make_subplots

    ts_fig = make_subplots(
        rows=2,
        cols=1,
        subplot_titles=(f"Time Series {comp_col}", "One-sided FFT"),
        vertical_spacing=0.25,
    )
    ts_fig.add_trace(
        go.Scatter(
            y=comp_ts_df_local[comp_col],
            mode="lines",
            name="Time Series",
            line=dict(color=line_color),
        ),
        row=1,
        col=1,
    )
    ts_data = comp_ts_df_local[comp_col].values
    n = len(ts_data)
    freq = _np.fft.rfftfreq(n)
    fft_values = _np.fft.rfft(ts_data)
    ts_fig.add_trace(
        go.Scatter(
            x=freq,
            y=_np.abs(fft_values),
            mode="lines",
            name="One-sided FFT",
            line=dict(color=line_color),
        ),
        row=2,
        col=1,
    )
    ts_fig.update_layout(
        height=400, showlegend=False, margin=dict(t=20, b=10, l=40, r=40)
    )
    ts_fig.update_xaxes(title_text="Time (volumes)", row=1, col=1)
    ts_fig.update_xaxes(title_text="Frequency (Hz)", row=2, col=1)
    ts_fig.update_yaxes(title_text="Amplitude", row=1, col=1)
    ts_fig.update_yaxes(title_text="Amplitude", row=2, col=1)
    return ts_fig.to_dict()


# End cache helpers ---------------------------------------------------------


def find_metrics_file(folder: str, ends_with: str) -> Path | None:
    p = Path(folder)
    if not p.exists() or not p.is_dir():
        return None
    for f in sorted(p.iterdir()):
        if f.is_file() and f.name.endswith(ends_with):
            return f
    return None


def main():
    selected_components = []
    current_selected = st.query_params.get("selected", "")
    selected_source = st.query_params.get("selected_source", None)
    if selected_source:
        st.session_state["last_selection_source"] = selected_source
        print(f"[DEBUG] Selection source from query param: {selected_source}")
    for x in current_selected.split(","):
        if x:
            parts = x.split("_")
            if len(parts) > 1:
                selected_components.append(int(parts[1]))
            else:
                selected_components.append(int(x))

    # Hidden trigger for rerun (we don't need the returned value)
    st.checkbox(
        "Trigger", key="trigger_checkbox", value=False, label_visibility="hidden"
    )
    # Hide the checkbox with CSS
    st.markdown(
        """<style> .stCheckbox {opacity: 0;} </style>""", unsafe_allow_html=True
    )
    


    st.set_page_config(page_title="Rica", layout="wide")
    st.title("Rica")

    st.markdown(
        "Enter a folder path on the machine where Streamlit runs. The app will look for a file that ends with `desc-tedana_metrics.tsv` and display it."
    )

    folder = st.text_input("Server folder path", value="")
    if st.button("Load metrics TSV") or st.session_state.get("loaded", False):
        if not st.session_state.get("loaded", False):
            if not folder:
                st.error("Please enter a folder path.")
                return

            comp_ts_path = find_metrics_file(folder, "desc-ICA_mixing.tsv")
            comp_ts_df = pd.read_csv(comp_ts_path, sep="\t", encoding="utf=8")
            # store path for cached ts figure generation
            st.session_state.comp_ts_path = comp_ts_path
            n_vols, n_comps = comp_ts_df.shape

            metrics_file = find_metrics_file(folder, "desc-tedana_metrics.tsv")

            ica_nii = find_metrics_file(folder, "desc-ICA_components.nii.gz")

            ica_nii_img = load_img(ica_nii)

            # The number of components should match the 4th dimension of the NIfTI image
            if ica_nii_img.shape[3] != n_comps:
                st.error(
                    f"Number of components in {comp_ts_path.name} ({n_comps}) does not match the 4th dimension of {ica_nii.name} ({ica_nii_img.shape[3]}). Please check your files."
                )
                return

            # Load the cross component metrics, including the kappa & rho elbows
            cross_component_metrics_path = find_metrics_file(
                folder, "desc-ICACrossComponent_metrics.json"
            )
            cross_comp_metrics_dict = io_utils.load_json(cross_component_metrics_path)

            # Store in session state
            st.session_state.loaded = True
            st.session_state.metrics_file = metrics_file
            st.session_state.n_comps = n_comps
            st.session_state.ica_nii = ica_nii
            st.session_state.ica_nii_img = ica_nii_img
            st.session_state.cross_comp_metrics_dict = cross_comp_metrics_dict
            st.session_state.comp_ts_df = comp_ts_df
        else:
            # Retrieve from session state
            metrics_file = st.session_state.metrics_file
            n_comps = st.session_state.n_comps
            ica_nii = st.session_state.ica_nii
            ica_nii_img = st.session_state.ica_nii_img
            cross_comp_metrics_dict = st.session_state.cross_comp_metrics_dict
            comp_ts_df = st.session_state.comp_ts_df

        # Load metrics file and use a single shared ColumnDataSource so selections link
        # Use the cached dict to avoid re-parsing/processing the file on every rerun
        data_dict = load_comptable_data_dict(str(metrics_file))
        # Ensure the color column matches the classification (override cached if needed)
        data_dict["color"] = [
            color_mapping.get(c, "#000000") for c in data_dict.get("classif", [])
        ]
        # Convert cached plain lists back into pandas Series where appropriate so
        # downstream code (e.g. .sort_values) continues to work as before.
        for k, v in list(data_dict.items()):
            try:
                # Wrap into a pandas Series to preserve methods like sort_values
                data_dict[k] = pd.Series(v)
            except Exception:
                # If conversion fails, keep original
                data_dict[k] = v
        # Keep 'component' and 'classif' as plain lists so existing code that
        # relies on list.index(...) and positional indexing continues to work.
        if "component" in data_dict:
            try:
                data_dict["component"] = [str(x) for x in data_dict["component"]]
            except Exception:
                pass
        if "classif" in data_dict:
            try:
                data_dict["classif"] = list(data_dict["classif"])
            except Exception:
                pass
        comptable_cds = ColumnDataSource(data=data_dict)

        # Ensure there is a boolean 'checked' column for the DataTable checkboxes.
        # If a previous run set selections via query params, reflect them here.
        if "checked" not in comptable_cds.data:
            try:
                nrows = len(comptable_cds.data["component"])
            except Exception:
                # Fallback: use length of first data column
                nrows = len(next(iter(comptable_cds.data.values())))
            comptable_cds.data["checked"] = [False] * nrows

        # Create df for table selection check
        df = pd.DataFrame(comptable_cds.data)
        # Make sure component is int
        df["component"] = df["component"].astype(int)
        # Sort by component number
        df = df.sort_values("component")
        # Reorder columns to have component first
        cols = df.columns.tolist()
        cols.insert(0, cols.pop(cols.index("component")))
        df = df[cols]

        # Drop index column if present
        if "index" in df.columns:
            df = df.drop(columns=["index"])

        # Ensure DataFrame has a clean integer index (no index column shown in UI)
        df = df.reset_index(drop=True)

        # Add some styling to the classif column
        def color_classif(val):
            color = color_mapping.get(val, "#000000")
            return f"color: {color}; font-weight: bold"

        # Note: .hide_index() is not available in some pandas versions; avoid calling it
        # We do not render a styled pandas Styler here because the editable table
        # is rendered using Streamlit's `st.data_editor` below.

        selected_indices = []
        if selected_components:
            for comp in selected_components:
                try:
                    idx = comptable_cds.data["component"].index(str(comp))
                    selected_indices.append(idx)
                except ValueError:
                    pass
        print(
            f"[DEBUG] Setting Bokeh selected.indices to: {selected_indices} (source: {st.session_state.get('last_selection_source')})"
        )
        comptable_cds.selected.indices = selected_indices

        # Reflect initial selection in the 'checked' column
        try:
            for i in range(len(comptable_cds.data["checked"])):
                comptable_cds.data["checked"][i] = i in selected_indices
            # Re-assign to trigger Bokeh change events if needed
            comptable_cds.data = dict(comptable_cds.data)
        except Exception:
            pass

        kappa_elbow = dynamic_plots.get_elbow_val(
            cross_comp_metrics_dict, "kappa_elbow"
        )
        rho_elbow = dynamic_plots.get_elbow_val(cross_comp_metrics_dict, "rho_elbow")

        # Create plots using the shared CDS
        kappa_rho_plot = dynamic_plots._create_kr_plt(
            comptable_cds, kappa_elbow=kappa_elbow, rho_elbow=rho_elbow
        )

        kappa_sorted_plot = dynamic_plots._create_sorted_plt(
            comptable_cds,
            n_comps,
            "kappa_rank",
            "kappa",
            title="Kappa Rank",
            x_label="Components sorted by Kappa",
            y_label="Kappa",
            elbow=kappa_elbow,
        )
        rho_sorted_plot = dynamic_plots._create_sorted_plt(
            comptable_cds,
            n_comps,
            "rho_rank",
            "rho",
            title="Rho Rank",
            x_label="Components sorted by Rho",
            y_label="Rho",
            elbow=rho_elbow,
        )
        varexp_pie_plot = dynamic_plots._create_varexp_pie_plt(comptable_cds)

        # Load nii file using nilearn

        # Create a Div to show selected component ID(s)
        selected_div = Div(text="Selected: None", width=800)

        # CustomJS callback to update the Div and query params when selection changes
        cb = CustomJS(
            args=dict(source=comptable_cds, div=selected_div),
            code="""
            const inds = cb_obj.indices;
            const data = source.data;
            if (data['checked']) {
                for (let i = 0; i < data['checked'].length; i++) {
                    data['checked'][i] = false;
                }
                for (let j = 0; j < inds.length; j++) {
                    data['checked'][inds[j]] = true;
                }
                source.data = data;
            }
            let components = '';
            for (let i = 0; i < inds.length; i++) {
                const idx = inds[i];
                if (data['component'] && data['component'][idx] !== undefined) {
                    const selected = data['component'][idx];
                    const selected_padded = String(selected).padStart(3, '0');
                    const selected_padded_C = 'ica_' + selected_padded;
                    components += selected_padded_C;
                    if (i < inds.length - 1) components += ',';
                }
            }
            // Update parent query params and set selected_source=bokeh
            const parentUrl = new URL(window.parent.location.href);
            parentUrl.searchParams.set('selected', components);
            parentUrl.searchParams.set('selected_source', 'bokeh');
            window.parent.history.replaceState(null, '', parentUrl);
            // Trigger rerun by toggling the hidden checkbox in parent
            const checkbox = window.parent.document.querySelector('input[type="checkbox"]');
            if (checkbox) { checkbox.click(); }
            """,
        )

        # Attach callback to the selection of the comptable CDS
        comptable_cds.selected.js_on_change("indices", cb)

        # Add a DocumentReady JS listener in the Bokeh document which listens
        # for window.postMessage messages from the parent Streamlit page. This
        # allows us to update the Bokeh ColumnDataSource selection live when
        # the Streamlit-side checkbox table is edited, without requiring a
        # Streamlit rerun.
        message_listener = CustomJS(
            args=dict(source=comptable_cds),
            code="""
            (function(){
                if (window._rica_message_listener_added) return;
                window._rica_message_listener_added = true;
                window.addEventListener('message', function(event){
                    try {
                        const data = event.data;
                        if (!data || data.type !== 'rica:set_selected') return;
                        const selected_tokens = data.selected || [];
                        const comps = source.data['component'];
                        const inds = [];
                        for (let i=0; i<selected_tokens.length; i++){
                            let token = selected_tokens[i];
                            if (typeof token === 'string' && token.startsWith('ica_')){
                                token = token.split('_')[1];
                            }
                            token = String(parseInt(token, 10));
                            for (let j=0; j<comps.length; j++){
                                if (String(comps[j]) === token) { inds.push(j); break; }
                            }
                        }
                        source.selected.indices = inds;
                        source.change.emit();
                    } catch (e) {
                        console.log('rica message handler error', e);
                    }
                }, false);
            })();
            """,
        )
        # Attach the listener to one of the figures so it runs on document ready
        try:
            kappa_rho_plot.js_on_event(events.DocumentReady, message_listener)
        except Exception:
            # If attaching fails, continue silently; selection sync will still work via query param/rerun
            pass

        # Compose a single layout so all models belong to the same document
        # The component metrics table is rendered outside of Bokeh (below),
        # so we don't include it in the Bokeh layout here.
        layout = column(
            row(kappa_rho_plot, varexp_pie_plot),
            row(kappa_sorted_plot, rho_sorted_plot),
            sizing_mode="stretch_width",
        )

        if selected_components:
            selected_comp = str(selected_components[0])
            # Look up the classification for this component so we can color the banner
            comp_idx = selected_components[0]
            try:
                comp_pos = comptable_cds.data["component"].index(str(comp_idx))
                comp_class = comptable_cds.data["classif"][comp_pos]
            except Exception:
                comp_class = None

            # Primary color for border/text from existing mapping; choose a soft bg
            primary_color = color_mapping.get(comp_class, "#83c5fc")
            bg_map = {
                "accepted": "#dff6e9",
                "rejected": "#ffe9e9",
                "ignored": "#e9f0ff",
            }
            bg_color = bg_map.get(comp_class, "#d0e9ff")

            style = (
                f"border: 1px solid {primary_color}; background-color: {bg_color}; "
                "padding: 1em; border-radius: 5px; text-align: center; max-width: 30%; "
                "margin-left: auto; margin-right: auto; margin-bottom: 1em; color: "
                f"{primary_color}; font-weight: bold;"
            )

            html = f"<div style='{style}'>Selected component: <strong>{selected_comp}</strong></div>"
            st.markdown(html, unsafe_allow_html=True)

        # Render the layout in the left half of the Streamlit page so plots occupy the left column
        left_col, right_col = st.columns([1, 1])
        with left_col:
            streamlit_bokeh(layout)

        # On the right, show the map if a component is selected
        with right_col:
            if selected_components:
                selected_comp = str(selected_components[0])
                # Components may be 0-indexed or 1-indexed depending on the dataset
                comp_index = selected_components[0]
                
                # Find the position of this component in the CDS (since CDS may be sorted)
                try:
                    comp_pos = comptable_cds.data["component"].index(str(comp_index))
                except ValueError:
                    comp_pos = None

                if comp_pos is not None:
                    accep_rejec = comptable_cds.data["classif"][comp_pos]
                else:
                    accep_rejec = None

                line_color = color_mapping.get(accep_rejec, "#000000")
                # Convert to the 0-indexed form for accessing the NIfTI image
                nii_index = comp_index  # If components are 0-indexed, no conversion needed
                if 0 <= nii_index < ica_nii_img.shape[3]:  # Check against actual number of components
                    comp_col = f"ICA_{comp_index:02d}"
                    # Use cached nilearn view HTML to avoid re-rendering every rerun
                    view_html = render_nilearn_view_html(str(ica_nii), nii_index)
                    st.markdown(
                        '<div style="margin-bottom: 0px;">', unsafe_allow_html=True
                    )
                    components.html(view_html, height=400)
                    st.markdown("</div>", unsafe_allow_html=True)

                    # Use cached Plotly figure dict for time series + FFT
                    comp_ts_path_session = st.session_state.get("comp_ts_path")
                    if comp_ts_path_session:
                        ts_fig_dict = make_ts_fig_dict(
                            str(comp_ts_path_session), comp_col, line_color
                        )
                    else:
                        # Fallback: build figure from in-memory DataFrame
                        ts_fig_dict = make_ts_fig_dict_from_df(
                            comp_ts_df, comp_col, line_color
                        )
                    ts_fig = go.Figure(ts_fig_dict)
                    st.plotly_chart(ts_fig, use_container_width=True)

                else:
                    st.error(
                        f"Component index {comp_index} is out of bounds for the NIfTI image (max: {ica_nii_img.shape[3]-1})."
                    )
            else:
                st.info("Select a component from the plots to view its spatial map.")

        # Add the metrics table at the bottom, full width.
        # Table now allows selection by clicking on rows and highlights the selected component.
        st.markdown("### Component Metrics Table")
        
        # Find the classification of the selected component to use the matching color
        comp_color = "#808080"  # Default gray color
        selected_class = None
        try:
            if selected_components:
                selected_comp = selected_components[0]
                comp_pos = comptable_cds.data["component"].index(str(selected_comp))
                selected_class = comptable_cds.data["classif"][comp_pos]
                comp_color = color_mapping.get(selected_class, "#808080")
        except (ValueError, KeyError):
            # If we can't find the component or its classification, use default color
            pass
        
        # Apply styling to highlight the selected row with the matching color
        def highlight_selected_row(data_df, selected_comp_list, highlight_color):
            # Create an empty DataFrame with the same shape as the input
            styles = pd.DataFrame('', index=data_df.index, columns=data_df.columns)
            # Find the row(s) that match the selected component and apply styling
            if selected_comp_list:
                selected_mask = data_df["component"] == selected_comp_list[0]
                # Create a background color with good contrast
                bg_color = f'background-color: {highlight_color}; color: black; font-weight: bold'
                styles.loc[selected_mask] = bg_color
            return styles
        
        # Display the table with highlighted selected row
        st.dataframe(df.style.apply(highlight_selected_row, 
                                   selected_comp_list=selected_components, 
                                   highlight_color=comp_color, axis=None), 
                     width="stretch", hide_index=True)
        
        # Add buttons for each component for selection
        st.markdown("#### Select by Row:")
        # Limit the number of buttons to avoid UI clutter, show first 10 components
        max_buttons = min(10, len(df))
        cols = st.columns(max_buttons)
        for i in range(max_buttons):
            row = df.iloc[i]
            comp_num = int(row['component'])
            comp_class = row.get('classif', 'unknown')
            button_color = color_mapping.get(comp_class, '#808080')
            
            with cols[i]:
                if st.button(f"Select {comp_num}", key=f"select_comp_{comp_num}"):
                    selected_token = f"ica_{comp_num:03d}"
                    st.session_state["last_selection_source"] = "table"
                    st.query_params["selected"] = selected_token
                    st.query_params["selected_source"] = "table"
                    st.rerun()
        
        # If user has selected more than 10 components, provide a way to select others
        if len(df) > 10:
            st.markdown("#### More Components:")
            remaining_components = df.iloc[10:]
            # Create a smaller selectbox for remaining components to avoid too many buttons
            remaining_options = {f"Component {int(row['component'])} ({row.get('classif', 'unknown')})": int(row['component']) 
                                for idx, row in remaining_components.iterrows()}
            remaining_options_list = list(remaining_options.keys())
            
            if remaining_options_list:
                selected_remaining = st.selectbox(
                    "Select from remaining components", 
                    options=[""] + remaining_options_list,
                    format_func=lambda x: x if x else "Select...",
                    key="remaining_components_selectbox"
                )
                
                if selected_remaining:
                    selected_comp = remaining_options[selected_remaining]
                    selected_token = f"ica_{selected_comp:03d}"
                    st.session_state["last_selection_source"] = "table"
                    st.query_params["selected"] = selected_token
                    st.query_params["selected_source"] = "table"
                    st.rerun()


if __name__ == "__main__":
    main()
