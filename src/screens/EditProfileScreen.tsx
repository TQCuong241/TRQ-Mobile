import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import CustomText from '../components/CustomText';
import { userService, type UserProfile, type UpdateProfileData } from '../services';
import { useAlert } from '../hooks/useAlert';
import { RootStackParamList } from '../types/navigation';

type EditProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FieldItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  showPrivacy?: boolean;
  privacy?: 'everyone' | 'contacts' | 'nobody';
  onEdit: () => void;
}

function EditProfileScreen() {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { colors, isDark } = useTheme();
  const { user, updateUser } = useAuth();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);

  // Collapsible sections
  const [personalInfoExpanded, setPersonalInfoExpanded] = useState(true);
  const [workExpanded, setWorkExpanded] = useState(true);
  const [educationExpanded, setEducationExpanded] = useState(true);

  // Form data
  const [currentLocation, setCurrentLocation] = useState('');
  const [hometown, setHometown] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married' | 'divorced' | 'widowed' | 'in_relationship' | 'prefer_not_to_say' | ''>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | ''>('');
  const [workCompany, setWorkCompany] = useState('');
  const [workPosition, setWorkPosition] = useState('');
  const [educationSchool, setEducationSchool] = useState('');
  const [educationMajor, setEducationMajor] = useState('');

  // Edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editFieldLabel, setEditFieldLabel] = useState('');
  const [editFieldHint, setEditFieldHint] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await userService.getCurrentUser();
      if (response.success && response.data) {
        const data = response.data;
        setProfileData(data);
        setCurrentLocation(data.currentLocation || '');
        setHometown(data.hometown || '');
        setDateOfBirth(data.dateOfBirth ? formatDateOfBirth(data.dateOfBirth) : '');
        setMaritalStatus(data.maritalStatus || '');
        setGender(data.gender || '');
        setWorkCompany(data.work?.company || '');
        setWorkPosition(data.work?.position || '');
        setEducationSchool(data.education?.school || '');
        setEducationMajor(data.education?.major || '');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      showAlert('Lỗi', 'Không thể tải thông tin profile', [{ text: 'OK' }], 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  const formatDateOfBirth = (dateString: string): string => {
    try {
      // Nếu đã là định dạng DD/MM/YYYY thì giữ nguyên
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
        return dateString;
      }
      // Nếu là ISO date (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
        const date = new Date(dateString);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      // Nếu là định dạng "DD tháng MM YYYY"
      const dateMatch = dateString.match(/(\d+)\s+tháng\s+(\d+)\s+(\d+)/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        return `${day}/${month}/${year}`;
      }
      // Parse các định dạng khác
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const parseDateInput = (input: string): string => {
    // Lấy tất cả số từ input (bỏ qua dấu /)
    const digits = input.replace(/\D/g, '');
    
    // Nếu không có số thì trả về rỗng
    if (digits.length === 0) {
      return '';
    }
    
    // Format theo DD/MM/YYYY dựa trên số lượng chữ số
    if (digits.length <= 2) {
      // Chỉ có ngày: 24
      return digits;
    } else if (digits.length <= 4) {
      // Có ngày và tháng: 24/10
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      // Có đầy đủ: 24/10/2003
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8); // Tối đa 4 chữ số cho năm
      return `${day}/${month}/${year}`;
    }
  };

  const getMaritalStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      single: 'Độc thân',
      married: 'Đã kết hôn',
      divorced: 'Đã ly dị',
      widowed: 'Góa',
      in_relationship: 'Đang trong mối quan hệ',
      prefer_not_to_say: 'Không muốn tiết lộ',
    };
    return labels[status] || status;
  };

  const getGenderLabel = (gender: string): string => {
    const labels: Record<string, string> = {
      male: 'Nam',
      female: 'Nữ',
      other: 'Khác',
      prefer_not_to_say: 'Không muốn tiết lộ',
    };
    return labels[gender] || gender;
  };

  const getFieldInfo = (fieldId: string): { label: string; hint: string } => {
    const fieldInfo: Record<string, { label: string; hint: string }> = {
      location: {
        label: 'Nơi ở hiện tại',
        hint: 'Nhập địa chỉ nơi bạn đang sống hiện tại (ví dụ: Hà Nội, Việt Nam)',
      },
      hometown: {
        label: 'Quê quán',
        hint: 'Nhập quê quán của bạn (ví dụ: Quảng Ngãi, Việt Nam)',
      },
      dateOfBirth: {
        label: 'Ngày sinh',
        hint: 'Nhập ngày sinh theo định dạng: DD/MM/YYYY (ví dụ: 24/10/2003)',
      },
      maritalStatus: {
        label: 'Tình trạng hôn nhân',
        hint: 'Chọn tình trạng hôn nhân hiện tại của bạn',
      },
      gender: {
        label: 'Giới tính',
        hint: 'Chọn giới tính của bạn',
      },
      workCompany: {
        label: 'Công ty',
        hint: 'Nhập tên công ty nơi bạn đang làm việc',
      },
      workPosition: {
        label: 'Chức vụ',
        hint: 'Nhập chức vụ hoặc vị trí công việc của bạn',
      },
      educationSchool: {
        label: 'Trường học',
        hint: 'Nhập tên trường học mà bạn đã hoặc đang theo học',
      },
      educationMajor: {
        label: 'Chuyên ngành',
        hint: 'Nhập chuyên ngành hoặc ngành học của bạn',
      },
    };
    return fieldInfo[fieldId] || { label: '', hint: '' };
  };

  const handleEditField = (fieldId: string) => {
    let value = '';
    switch (fieldId) {
      case 'location':
        value = currentLocation;
        break;
      case 'hometown':
        value = hometown;
        break;
      case 'dateOfBirth':
        value = dateOfBirth;
        break;
      case 'maritalStatus':
        value = maritalStatus;
        break;
      case 'gender':
        value = gender;
        break;
      case 'workCompany':
        value = workCompany;
        break;
      case 'workPosition':
        value = workPosition;
        break;
      case 'educationSchool':
        value = educationSchool;
        break;
      case 'educationMajor':
        value = educationMajor;
        break;
    }
    const fieldInfo = getFieldInfo(fieldId);
    setEditingField(fieldId);
    setEditValue(value);
    setEditFieldLabel(fieldInfo.label);
    setEditFieldHint(fieldInfo.hint);
    setEditModalVisible(true);
  };

  const handleSaveField = async () => {
    if (!editingField) return;

    try {
      setLoading(true);
      const updateData: UpdateProfileData = {};

      switch (editingField) {
        case 'location':
          updateData.currentLocation = editValue.trim() || undefined;
          setCurrentLocation(editValue.trim());
          break;
        case 'hometown':
          updateData.hometown = editValue.trim() || undefined;
          setHometown(editValue.trim());
          break;
        case 'dateOfBirth':
          // Convert DD/MM/YYYY to ISO format
          const dateParts = editValue.split('/');
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10);
            const year = parseInt(dateParts[2], 10);
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
              const isoDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              updateData.dateOfBirth = isoDate;
              setDateOfBirth(editValue); // Keep formatted value
            }
          }
          break;
        case 'maritalStatus':
          updateData.maritalStatus = editValue as any;
          setMaritalStatus(editValue as any);
          break;
        case 'gender':
          updateData.gender = editValue as any;
          setGender(editValue as any);
          break;
        case 'workCompany':
          updateData.work = { company: editValue.trim() || undefined, position: workPosition || undefined };
          setWorkCompany(editValue.trim());
          break;
        case 'workPosition':
          updateData.work = { company: workCompany || undefined, position: editValue.trim() || undefined };
          setWorkPosition(editValue.trim());
          break;
        case 'educationSchool':
          updateData.education = { school: editValue.trim() || undefined, major: educationMajor || undefined };
          setEducationSchool(editValue.trim());
          break;
        case 'educationMajor':
          updateData.education = { school: educationSchool || undefined, major: editValue.trim() || undefined };
          setEducationMajor(editValue.trim());
          break;
      }

      const response = await userService.updateProfile(updateData);
      if (response.success && response.data) {
        setProfileData(response.data);
        updateUser({
          _id: response.data._id,
          username: response.data.username,
          email: response.data.email,
          displayName: response.data.displayName,
          isVerified: response.data.isVerified,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
        });
        setEditModalVisible(false);
        setEditingField(null);
        setEditValue('');
        setEditFieldLabel('');
        setEditFieldHint('');
      } else {
        showAlert('Lỗi', response.message || 'Không thể cập nhật', [{ text: 'OK' }], 'error');
      }
    } catch (error: any) {
      console.error('Error updating field:', error);
      showAlert('Lỗi', error.message || 'Có lỗi xảy ra', [{ text: 'OK' }], 'error');
    } finally {
      setLoading(false);
    }
  };

  const FieldItem = ({ item }: { item: FieldItem }) => {
    return (
      <TouchableOpacity
        style={styles.fieldItem}
        onPress={item.onEdit}
        activeOpacity={0.7}>
        <View style={styles.fieldLeft}>
          <Icon name={item.icon} size={24} color={colors.text} />
          <View style={styles.fieldContent}>
            <CustomText 
              variant="body" 
              color={item.value === 'Chưa có' ? colors.textSecondary : colors.text} 
              style={styles.fieldLabel}>
              {item.value || item.label}
            </CustomText>
            {item.subValue && (
              <CustomText variant="caption" color={colors.textSecondary} style={styles.fieldSubValue}>
                {item.subValue}
              </CustomText>
            )}
            {item.showPrivacy && (
              <View style={styles.privacyRow}>
                <Icon name="public" size={14} color={colors.textSecondary} />
                <CustomText variant="caption" color={colors.textSecondary} style={styles.privacyText}>
                  Công khai
                </CustomText>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={item.onEdit} activeOpacity={0.7}>
          <Icon name="edit" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const CollapsibleSection = ({
    title,
    expanded,
    onToggle,
    children,
  }: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => {
    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={onToggle}
          activeOpacity={0.7}>
          <CustomText variant="h3" weight="semibold" color={colors.text}>
            {title}
          </CustomText>
          <Icon
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        {expanded && <View style={styles.sectionContent}>{children}</View>}
      </View>
    );
  };

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <CustomText variant="body" color={colors.textSecondary} style={styles.loadingText}>
            Đang tải thông tin...
          </CustomText>
        </View>
      </View>
    );
  }

  const personalInfoFields: FieldItem[] = [
    {
      id: 'location',
      icon: 'location-on',
      label: 'Nơi ở hiện tại',
      value: currentLocation || 'Chưa có',
      showPrivacy: !!currentLocation,
      onEdit: () => handleEditField('location'),
    },
    {
      id: 'hometown',
      icon: 'home',
      label: 'Quê quán',
      value: hometown || 'Chưa có',
      showPrivacy: !!hometown,
      onEdit: () => handleEditField('hometown'),
    },
    {
      id: 'dateOfBirth',
      icon: 'cake',
      label: 'Ngày sinh',
      value: dateOfBirth || 'Chưa có',
      showPrivacy: false,
      onEdit: () => handleEditField('dateOfBirth'),
    },
    {
      id: 'maritalStatus',
      icon: 'favorite',
      label: 'Tình trạng hôn nhân',
      value: maritalStatus ? getMaritalStatusLabel(maritalStatus) : 'Chưa có',
      showPrivacy: !!maritalStatus,
      onEdit: () => handleEditField('maritalStatus'),
    },
    {
      id: 'gender',
      icon: 'wc',
      label: 'Giới tính',
      value: gender ? getGenderLabel(gender) : 'Chưa có',
      showPrivacy: false,
      onEdit: () => handleEditField('gender'),
    },
  ];

  const workFields: FieldItem[] = [
    {
      id: 'workCompany',
      icon: 'business',
      label: 'Công ty',
      value: workCompany || 'Chưa có',
      showPrivacy: !!workCompany,
      onEdit: () => handleEditField('workCompany'),
    },
    {
      id: 'workPosition',
      icon: 'work',
      label: 'Chức vụ',
      value: workPosition || 'Chưa có',
      showPrivacy: !!workPosition,
      onEdit: () => handleEditField('workPosition'),
    },
  ];

  const educationFields: FieldItem[] = [
    {
      id: 'educationSchool',
      icon: 'school',
      label: 'Trường học',
      value: educationSchool || 'Chưa có',
      showPrivacy: !!educationSchool,
      onEdit: () => handleEditField('educationSchool'),
    },
    {
      id: 'educationMajor',
      icon: 'menu-book',
      label: 'Chuyên ngành',
      value: educationMajor || 'Chưa có',
      showPrivacy: !!educationMajor,
      onEdit: () => handleEditField('educationMajor'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <CustomText variant="h3" weight="bold" color={colors.text} style={styles.headerTitle}>
          Chỉnh sửa trang cá nhân
        </CustomText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Personal Information */}
        <CollapsibleSection
          title="Thông tin cá nhân"
          expanded={personalInfoExpanded}
          onToggle={() => setPersonalInfoExpanded(!personalInfoExpanded)}>
          {personalInfoFields.map((field) => (
            <FieldItem key={field.id} item={field} />
          ))}
        </CollapsibleSection>

        {/* Work */}
        <CollapsibleSection
          title="Công việc"
          expanded={workExpanded}
          onToggle={() => setWorkExpanded(!workExpanded)}>
          {workFields.map((field) => (
            <FieldItem key={field.id} item={field} />
          ))}
        </CollapsibleSection>

        {/* Education */}
        <CollapsibleSection
          title="Giáo dục"
          expanded={educationExpanded}
          onToggle={() => setEducationExpanded(!educationExpanded)}>
          {educationFields.map((field) => (
            <FieldItem key={field.id} item={field} />
          ))}
        </CollapsibleSection>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setEditModalVisible(false);
          setEditingField(null);
          setEditValue('');
        }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingField(null);
                  setEditValue('');
                  setEditFieldLabel('');
                  setEditFieldHint('');
                }}>
                <CustomText variant="body" color={colors.primary}>
                  Hủy
                </CustomText>
              </TouchableOpacity>
              <CustomText variant="h3" weight="bold" color={colors.text}>
                {editFieldLabel || 'Chỉnh sửa'}
              </CustomText>
              <TouchableOpacity onPress={handleSaveField} disabled={loading}>
                <CustomText variant="body" weight="semibold" color={loading ? colors.textSecondary : colors.primary}>
                  Lưu
                </CustomText>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {editFieldHint && (
                <CustomText variant="caption" color={colors.textSecondary} style={styles.fieldHint}>
                  {editFieldHint}
                </CustomText>
              )}
              {editingField === 'maritalStatus' ? (
                <View style={styles.pickerOptions}>
                  {[
                    { label: 'Độc thân', value: 'single' },
                    { label: 'Đã kết hôn', value: 'married' },
                    { label: 'Đã ly dị', value: 'divorced' },
                    { label: 'Góa', value: 'widowed' },
                    { label: 'Đang trong mối quan hệ', value: 'in_relationship' },
                    { label: 'Không muốn tiết lộ', value: 'prefer_not_to_say' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        {
                          backgroundColor: editValue === option.value ? colors.primary + '20' : 'transparent',
                          borderColor: editValue === option.value ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setEditValue(option.value)}
                      activeOpacity={0.7}>
                      <CustomText
                        variant="body"
                        color={editValue === option.value ? colors.primary : colors.text}
                        weight={editValue === option.value ? 'semibold' : 'normal'}>
                        {option.label}
                      </CustomText>
                      {editValue === option.value && <Icon name="check" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : editingField === 'gender' ? (
                <View style={styles.pickerOptions}>
                  {[
                    { label: 'Nam', value: 'male' },
                    { label: 'Nữ', value: 'female' },
                    { label: 'Khác', value: 'other' },
                    { label: 'Không muốn tiết lộ', value: 'prefer_not_to_say' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerOption,
                        {
                          backgroundColor: editValue === option.value ? colors.primary + '20' : 'transparent',
                          borderColor: editValue === option.value ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setEditValue(option.value)}
                      activeOpacity={0.7}>
                      <CustomText
                        variant="body"
                        color={editValue === option.value ? colors.primary : colors.text}
                        weight={editValue === option.value ? 'semibold' : 'normal'}>
                        {option.label}
                      </CustomText>
                      {editValue === option.value && <Icon name="check" size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      marginTop: editFieldHint ? 8 : 0,
                    },
                  ]}
                  value={editingField === 'dateOfBirth' ? parseDateInput(editValue) : editValue}
                  onChangeText={(text) => {
                    if (editingField === 'dateOfBirth') {
                      const formatted = parseDateInput(text);
                      setEditValue(formatted);
                    } else {
                      setEditValue(text);
                    }
                  }}
                  placeholderTextColor={colors.textSecondary}
                  placeholder={
                    editingField === 'dateOfBirth'
                      ? 'VD: 24/10/2003'
                      : editingField === 'location'
                      ? 'VD: Hà Nội, Việt Nam'
                      : editingField === 'hometown'
                      ? 'VD: Quảng Ngãi, Việt Nam'
                      : 'Nhập thông tin'
                  }
                  multiline={editingField === 'educationSchool' || editingField === 'educationMajor'}
                  keyboardType={editingField === 'dateOfBirth' ? 'numeric' : 'default'}
                  maxLength={editingField === 'dateOfBirth' ? 10 : undefined}
                />
              )}
            </View>
            {loading && (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionContent: {
    paddingHorizontal: 16,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  fieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fieldContent: {
    marginLeft: 12,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 15,
  },
  fieldSubValue: {
    marginTop: 2,
    fontSize: 12,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  privacyText: {
    marginLeft: 4,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalBody: {
    padding: 20,
  },
  fieldHint: {
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  modalLoading: {
    padding: 20,
    alignItems: 'center',
  },
  pickerOptions: {
    gap: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
});

export default EditProfileScreen;
