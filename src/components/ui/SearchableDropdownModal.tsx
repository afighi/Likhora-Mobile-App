import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Pressable 
} from 'react-native';
import { Search, Check, X, ChevronDown } from 'lucide-react-native';
import { LikhoraColors, Radius, Spacing, LikhoraFont } from '@/constants/theme';
import { LocationItem } from '@/services/location';

interface SearchableDropdownModalProps {
  label: string;
  placeholder?: string;
  items: LocationItem[];
  selectedItem: LocationItem | null;
  onSelect: (item: LocationItem) => void;
  disabled?: boolean;
}

export const SearchableDropdownModal: React.FC<SearchableDropdownModalProps> = ({
  label,
  placeholder = 'Select option...',
  items,
  selectedItem,
  onSelect,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectItem = (item: LocationItem) => {
    onSelect(item);
    setSearchQuery('');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {/* Dropdown Trigger Box */}
      <TouchableOpacity
        style={[
          styles.triggerBox,
          disabled && styles.triggerDisabled,
          selectedItem && styles.triggerSelected,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedItem && styles.placeholderText,
            disabled && styles.disabledText,
          ]}
          numberOfLines={1}
        >
          {selectedItem ? selectedItem.name : placeholder}
        </Text>
        <ChevronDown size={20} color={disabled ? '#D1D5DB' : LikhoraColors.primary} />
      </TouchableOpacity>

      {/* Independent Scrollable Popover Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            {/* Sheet Handle */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select {label}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <X size={20} color={LikhoraColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBox}>
              <Search size={18} color={LikhoraColors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor={LikhoraColors.textPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color={LikhoraColors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Independent Scroll List */}
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.code}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              renderItem={({ item }) => {
                const isSelected = selectedItem?.code === item.code;
                return (
                  <TouchableOpacity
                    style={[
                      styles.listItem,
                      isSelected && styles.listItemSelected,
                    ]}
                    onPress={() => handleSelectItem(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.itemText,
                        isSelected && styles.itemTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Check size={18} color={LikhoraColors.primary} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No matching locations found.</Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.three,
    width: '100%',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: LikhoraColors.textPrimary,
    marginBottom: 6,
    fontFamily: LikhoraFont.fontFamily,
  },
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.large,
    borderWidth: 1.5,
    borderColor: LikhoraColors.border,
    paddingHorizontal: Spacing.three,
    height: 52,
  },
  triggerSelected: {
    borderColor: LikhoraColors.primary,
    backgroundColor: '#FFFFFF',
  },
  triggerDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  triggerText: {
    fontSize: 15,
    fontWeight: '600',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: LikhoraColors.textPlaceholder,
    fontWeight: '400',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '50%',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  closeBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LikhoraColors.inputBackground,
    borderRadius: Radius.medium,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  listContent: {
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: Radius.medium,
    marginBottom: 4,
  },
  listItemSelected: {
    backgroundColor: LikhoraColors.secondaryLavender,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '600',
    color: LikhoraColors.textPrimary,
    fontFamily: LikhoraFont.fontFamily,
  },
  itemTextSelected: {
    color: LikhoraColors.primary,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: LikhoraColors.textSecondary,
    fontFamily: LikhoraFont.fontFamily,
  },
});
