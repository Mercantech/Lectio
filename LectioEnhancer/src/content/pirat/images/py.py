import os

def add_prefix_to_files(folder_path, prefix="C-"):
    try:
        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            
            if os.path.isfile(file_path):  # Kun filer, ikke mapper
                # Tjek om filen allerede starter med prefix
                if not filename.upper().startswith(prefix):
                    # Tilføj prefix og konverter til store bogstaver
                    new_name = os.path.join(folder_path, f"{prefix}{filename.upper()}")
                    os.rename(file_path, new_name)

        print("Filer er blevet omdøbt.")
    except Exception as e:
        print(f"Der opstod en fejl: {e}")

# Skift 'din_mappe' ud med stien til den mappe, du vil ændre
folder_path = "Cards"
add_prefix_to_files(folder_path)
