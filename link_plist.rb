require 'xcodeproj'

project_path = 'ios/TravelBuddy.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the group where the file should be (usually the main group or a specific folder)
group = project.main_group['TravelBuddy']
file_path = 'GoogleService-Info.plist'

# Create the file reference if it doesn't exist
file_ref = group.find_file_by_path(file_path) || group.new_reference(file_path)

# Add to the main target
target = project.targets.first # Assuming the first target is the app target
target.add_resources([file_ref])

project.save

puts "Successfully added GoogleService-Info.plist to the project!"
